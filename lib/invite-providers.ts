// Invite provider abstraction. This is UI and documentation only.
// No email or SMS is sent by this code, no provider is hardcoded, and no
// secret is stored or read here. Link invites are the only working invite
// today; email and phone invites stay visibly "not configured" until
// Kartikey chooses a provider and configures it server-side, in a later
// milestone. Any future provider must be added here behind this same
// interface, with credentials in server-only environment, never in code
// and never in a browser bundle.

export type InviteChannel = "link" | "email" | "phone";

export type InviteProviderStatus = {
  channel: InviteChannel;
  configured: boolean;
  label: string;
  note: string;
};

export function getInviteProviderStatus(): InviteProviderStatus[] {
  return [
    {
      channel: "link",
      configured: true,
      label: "Share link",
      note: "Working today. Anyone with the link can join as a member.",
    },
    {
      channel: "email",
      configured: false,
      label: "Email invite",
      note: "Not configured. No email is sent. A provider must be chosen and configured server-side before this works.",
    },
    {
      channel: "phone",
      configured: false,
      label: "Phone / SMS invite",
      note: "Not configured. No SMS is sent. A provider must be chosen and configured server-side before this works.",
    },
  ];
}

// Deliberately a no-op that explains itself. A future provider
// implementation replaces this return value, it must not silently start
// sending mail or SMS from a form submit.
export function requestInvite(
  channel: InviteChannel
): { sent: boolean; message: string } {
  if (channel === "link") {
    return {
      sent: false,
      message:
        "Link invites do not need sending: copy the workspace invite link from Settings.",
    };
  }
  return {
    sent: false,
    message: `${
      channel === "email" ? "Email" : "Phone"
    } invites are not configured, so nothing was sent. Link invites work today.`,
  };
}
