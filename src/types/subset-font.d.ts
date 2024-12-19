declare module 'subset-font' {
  export default function subsetFont(
    fontBuffer: Buffer,
    text: string
  ): Promise<Buffer>
}
