import {
  dingliehakka,
  masaFont,
  uzuraFont,
  jasonHandwriting2,
  kurewaGothicTc,
  kurewaGothicJp
} from '@/config/fonts'

interface FontWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function FontWrapper({ children, className = '' }: FontWrapperProps) {
  return (
    <div className={`
      ${dingliehakka.variable}
      ${masaFont.variable}
      ${uzuraFont.variable}
      ${jasonHandwriting2.variable}
      ${kurewaGothicTc.variable}
      ${kurewaGothicJp.variable}
      ${className}
    `}>
      {children}
    </div>
  )
} 