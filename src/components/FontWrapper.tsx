import {
  honyaJi,
  masaFont,
  jasonHandwriting2,
  jasonHandwriting5p,
  uzuraFont,
  kurewaGothic,
  dingliehakka
} from '@/config/fonts'

interface FontWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function FontWrapper({ children, className = '' }: FontWrapperProps) {
  return (
    <div className={`
      ${honyaJi.variable} 
      ${masaFont.variable} 
      ${jasonHandwriting2.variable}
      ${jasonHandwriting5p.variable}
      ${kurewaGothic.variable}
      ${uzuraFont.variable}
      ${dingliehakka.variable}
      ${className}
    `}>
      {children}
    </div>
  )
} 