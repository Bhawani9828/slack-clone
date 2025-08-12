// app/dashboard/[channelId]/page.tsx

import ClientWrapper from "./ClientWrapper";

export default async function ChannelPage(props: {
  params: { channelId: string };
}) {
  const { channelId } = await Promise.resolve(props.params); 

  return <ClientWrapper channelId={channelId} />;
}
