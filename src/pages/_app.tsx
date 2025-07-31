import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { FontWrapper } from '@/components/FontWrapper';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import CartDrawer from '@/components/CartDrawer'
import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Toaster } from 'sonner'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    useCartStore.getState().loadFromStorage()
  }, [])
  
  return (
    <>
      <ServiceWorkerRegistration />
      <FontWrapper>
        <Component {...pageProps} />
      </FontWrapper>
      <CartDrawer />
      <Toaster 
        position="top-center"
        richColors
        closeButton
        theme="light"
      />
    </>
  );
}
