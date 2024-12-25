import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { FontWrapper } from '@/components/FontWrapper';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ServiceWorkerRegistration />
      <FontWrapper>
        <Component {...pageProps} />
      </FontWrapper>
    </>
  );
}
