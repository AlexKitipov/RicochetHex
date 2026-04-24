// Integration test: guest can list waiting rooms via the new RLS SELECT policy,
// then join via the join_room RPC, and the row transitions to status='playing'
// with guest_id populated.
//
// Runs with: deno test --allow-net --allow-env

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
  assertEquals(room.status, "waiting");
  assertEquals(room.guest_id, null);

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
    const found = visibleRooms!.find((r) => r.id === room.id);
    assertExists(found, "guest should see the freshly created waiting room via RLS");
    assertEquals(found!.status, "waiting");
    assertEquals(found!.guest_id, null);

    // 3. Guest calls join_room RPC (SECURITY DEFINER) with the room code.
    const { data: joinedId, error: joinErr } = await guest.client.rpc("join_room", {
      p_room_code: room.room_code,
    });
    assertEquals(joinErr, null, `join_room error: ${joinErr?.message}`);
    assertEquals(joinedId, room.id);

    // 4. Verify (via service role to bypass RLS for assertion clarity)
    //    the row transitioned to status='playing' with guest_id set.
    const admin = adminClient();
    const { data: updated, error: readErr } = await admin
      .from("game_rooms")
      .select("status, guest_id, host_id")
      .eq("id", room.id)
      .single();
    assertEquals(readErr, null);
    assertExists(updated);
    assertEquals(updated!.status, "playing");
    assertEquals(updated!.guest_id, guest.userId);
    assertEquals(updated!.host_id, host.userId);

    // 5. As participant, the guest can still SELECT the room (covered by
    //    "Participants can view rooms" once status flips off 'waiting').
    const { data: postJoin, error: postErr } = await guest.client
      .from("game_rooms")
      .select("id, status, guest_id")
      .eq("id", room.id)
      .single();
    assertEquals(postErr, null);
    assertEquals(postJoin?.status, "playing");
    assertEquals(postJoin?.guest_id, guest.userId);

    // 6. A third unrelated guest must NOT be able to see the now-playing room
    //    (waiting-room policy no longer matches; participant policy doesn't apply).
    const outsider = await signInAsGuest("Outsider-Test");
    const { data: outsiderView } = await outsider.client
      .from("game_rooms")
      .select("id")
      .eq("id", room.id);
    assert(
      !outsiderView || outsiderView.length === 0,
      "non-participant should not see a room that is no longer waiting",
    );
  } finally {
    // Cleanup: delete test room with admin client.
    const admin = adminClient();
    await admin.from("game_rooms").delete().eq("id", room.id);
  }
});
