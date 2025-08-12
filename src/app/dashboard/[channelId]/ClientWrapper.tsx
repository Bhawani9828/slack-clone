'use client';

import ChatArea from "@/components/chat/ChatArea";

export default function ClientWrapper({ channelId }: { channelId: string }) {
  return <ChatArea channelId={channelId} />;
}
