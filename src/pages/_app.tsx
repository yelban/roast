import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {
  honyaJi,
  masaFont,
  jasonHandwriting2,
  jasonHandwriting5p,
  kurewaGothic,
  dingliehakka
} from '@/config/fonts'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`
      ${honyaJi.variable} 
      ${masaFont.variable} 
      ${jasonHandwriting2.variable}
      ${jasonHandwriting5p.variable}
      ${kurewaGothic.variable}
      ${dingliehakka.variable}
    `}>
      <Component {...pageProps} />
    </div>
  );
}
