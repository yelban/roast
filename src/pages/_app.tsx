import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { FontWrapper } from '@/components/FontWrapper';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FontWrapper>
      <Component {...pageProps} />
    </FontWrapper>
  );
}
