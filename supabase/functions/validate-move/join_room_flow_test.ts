// Integration test: guest can list waiting rooms via the new RLS SELECT policy,
// then join via the join_room RPC, and the row transitions to status='playing'
// with guest_id populated.
//
// Runs with: deno test --allow-net --allow-env
// Uses only the anon key + RLS-scoped reads — no service role required.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// Anon/publishable key — Supabase exposes one or the other depending on environment.
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    `Missing required env vars. Have URL=${!!SUPABASE_URL}, ANON=${!!SUPABASE_ANON_KEY}`,
  );
}

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInAsGuest(displayName: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { display_name: displayName, is_guest: true } },
  });
  if (error) throw error;
  assertExists(data.user, "guest user should be created");
  return { client, userId: data.user!.id };
}

Deno.test("guest can list waiting rooms, join via RPC, and room flips to playing", async () => {
  // 1. Host (also a guest auth user for test simplicity) creates a waiting room.
  const host = await signInAsGuest("Host-Test");
  const { data: room, error: createErr } = await host.client
    .from("game_rooms")
    .insert({ host_id: host.userId, host_color: "blue" })
    .select()
    .single();
  assertEquals(createErr, null, `create room error: ${createErr?.message}`);
  assertExists(room);
  assertEquals(room!.status, "waiting");
  assertEquals(room!.guest_id, null);

  try {
    // 2. A second user signs in as guest and queries waiting rooms.
    //    This exercises the new RLS SELECT policy:
    //    "Authenticated users can view waiting rooms" (status='waiting' AND guest_id IS NULL).
    const guest = await signInAsGuest("Guest-Test");
    const { data: visibleRooms, error: listErr } = await guest.client
      .from("game_rooms")
      .select("id, room_code, status, guest_id")
      .eq("status", "waiting")
      .is("guest_id", null);

    assertEquals(listErr, null, `list waiting rooms error: ${listErr?.message}`);
    assertExists(visibleRooms);
    const found = visibleRooms!.find((r) => r.id === room!.id);
    assertExists(found, "guest should see the freshly created waiting room via RLS");
    assertEquals(found!.status, "waiting");
    assertEquals(found!.guest_id, null);

    // 3. Guest calls join_room RPC (SECURITY DEFINER) with the room code.
    const { data: joinedId, error: joinErr } = await guest.client.rpc("join_room", {
      p_room_code: room!.room_code,
    });
    assertEquals(joinErr, null, `join_room error: ${joinErr?.message}`);
    assertEquals(joinedId, room!.id);

    // 4. As participant, the guest can SELECT the room via
    //    "Participants can view rooms" and verify the new state.
    const { data: postJoin, error: postErr } = await guest.client
      .from("game_rooms")
      .select("id, status, guest_id, host_id")
      .eq("id", room!.id)
      .single();
    assertEquals(postErr, null, `post-join read error: ${postErr?.message}`);
    assertExists(postJoin);
    assertEquals(postJoin!.status, "playing");
    assertEquals(postJoin!.guest_id, guest.userId);
    assertEquals(postJoin!.host_id, host.userId);

    // 5. A third unrelated guest must NOT be able to see the now-playing room
    //    (waiting-room policy no longer matches; participant policy doesn't apply).
    const outsider = await signInAsGuest("Outsider-Test");
    const { data: outsiderView } = await outsider.client
      .from("game_rooms")
      .select("id")
      .eq("id", room!.id);
    assert(
      !outsiderView || outsiderView.length === 0,
      "non-participant should not see a room that is no longer waiting",
    );

    // 6. join_room must reject a second attempt (slot already filled,
    //    cannot overwrite an existing guest).
    const otherGuest = await signInAsGuest("Other-Guest-Test");
    const { error: secondJoinErr } = await otherGuest.client.rpc("join_room", {
      p_room_code: room!.room_code,
    });
    assertExists(
      secondJoinErr,
      "join_room must reject a second guest trying to overwrite the slot",
    );
  } finally {
    // Cleanup: host deletes the room via "Host can delete own room" policy.
    await host.client.from("game_rooms").delete().eq("id", room!.id);
  }
});
