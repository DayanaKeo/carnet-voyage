import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

function MyApp({ Component, pageProps: { session, ...pageProps } }: { Component: React.ComponentType, pageProps: { session: Session } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
export default MyApp;
