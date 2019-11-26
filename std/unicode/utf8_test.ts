// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.

import { fullRune, fullRuneInString, decodeRune, RuneError } from "./utf8.ts";
import { test, runIfMain } from "../testing/mod.ts";
import { assertEquals, fail } from "../testing/asserts.ts";

interface Utf8Map {
  r: unknown;
  str: string;
}

const utf8map: Utf8Map[] = [
  { r: 0x0000, str: "\x00" },
  { r: 0x0001, str: "\x01" },
  { r: 0x007e, str: "\x7e" },
  { r: 0x007f, str: "\x7f" },
  { r: 0x0080, str: "\xc2\x80" },
  { r: 0x0081, str: "\xc2\x81" },
  { r: 0x00bf, str: "\xc2\xbf" },
  { r: 0x00c0, str: "\xc3\x80" },
  { r: 0x00c1, str: "\xc3\x81" },
  { r: 0x00c8, str: "\xc3\x88" },
  { r: 0x00d0, str: "\xc3\x90" },
  { r: 0x00e0, str: "\xc3\xa0" },
  { r: 0x00f0, str: "\xc3\xb0" },
  { r: 0x00f8, str: "\xc3\xb8" },
  { r: 0x00ff, str: "\xc3\xbf" },
  { r: 0x0100, str: "\xc4\x80" },
  { r: 0x07ff, str: "\xdf\xbf" },
  { r: 0x0400, str: "\xd0\x80" },
  { r: 0x0800, str: "\xe0\xa0\x80" },
  { r: 0x0801, str: "\xe0\xa0\x81" },
  { r: 0x1000, str: "\xe1\x80\x80" },
  { r: 0xd000, str: "\xed\x80\x80" },
  { r: 0xd7ff, str: "\xed\x9f\xbf" }, // last code point before surrogate half.
  { r: 0xe000, str: "\xee\x80\x80" }, // first code point after surrogate half.
  { r: 0xfffe, str: "\xef\xbf\xbe" },
  { r: 0xffff, str: "\xef\xbf\xbf" },
  { r: 0x10000, str: "\xf0\x90\x80\x80" },
  { r: 0x10001, str: "\xf0\x90\x80\x81" },
  { r: 0x40000, str: "\xf1\x80\x80\x80" },
  { r: 0x10fffe, str: "\xf4\x8f\xbf\xbe" },
  { r: 0x10ffff, str: "\xf4\x8f\xbf\xbf" },
  { r: 0xfffd, str: "\xef\xbf\xbd" }
];

const surrogateMap: Utf8Map[] = [
  { r: 0xd800, str: "\xed\xa0\x80" }, // surrogate min decodes to (RuneError, 1)
  { r: 0xdfff, str: "\xed\xbf\xbf" } // surrogate max decodes to (RuneError, 1)
];

const testStrings = [
  "",
  "abcd",
  "☺☻☹",
  "日a本b語ç日ð本Ê語þ日¥本¼語i日©",
  "日a本b語ç日ð本Ê語þ日¥本¼語i日©日a本b語ç日ð本Ê語þ日¥本¼語i日©日a本b語ç日ð本Ê語þ日¥本¼語i日©",
  "\x80\x80\x80\x80"
];

test(function utf8FullRune(): void {
  for (const m of utf8map) {
    const b = new TextEncoder().encode(m.str);

    assertEquals(fullRune(b), true);

    const s = m.str;
    assertEquals(fullRuneInString(s), true);

    const b1 = b.slice(0, b.length - 2);
    assertEquals(fullRune(b1), false);

    const s1 = new TextDecoder().decode(b1);
    assertEquals(fullRuneInString(s1), false);
  }

  for (const s of ["\xc0", "\xc1"]) {
    const b = new TextEncoder().encode(s);

    assertEquals(fullRune(b), true);
    assertEquals(fullRuneInString(s), true);
  }
});

test(function utf8DecodeRune(): void {
  for (const m of utf8map) {
    const b = new TextEncoder().encode(m.str);
    const bLen = new TextDecoder().decode(b).length;

    const { rune: r, size: z } = decodeRune(b);

    if (r != m.r || z != bLen) {
      fail(
        `DecodeRune: expect ${m.r} but got ${r}, and expect ${bLen} but got ${z}`
      );
    }

    {
      const { rune: r, size: z } = decodeRune(m.str);

      const bLen = m.str.length;

      if (r != m.r || z != bLen) {
        fail(
          `DecodeRune: expect ${m.r} but got ${r}, and expect ${bLen} but got ${z}`
        );
      }
    }

    // function cap(p: Uint8Array): number {
    //   const n = new TextDecoder().decode(p).length;
    //   return n + (8 - (n % 8));
    // }

    // function paddingZero(p: Uint8Array, length: number): Uint8Array {
    //   p = new Uint8Array(
    //     new TextDecoder()
    //       .decode(p)
    //       .split("")
    //       .map((v: string) => v.charCodeAt(0))
    //   );

    //   const u = new Uint8Array(length);
    //   for (let i = 0; i < u.length; i++) {
    //     u[i] = p[i] || 0;
    //   }
    //   return u;
    // }

    // {
    //   // there's an extra byte that bytes left behind - make sure trailing byte works
    //   const d = paddingZero(b, cap(b));
    //   console.log(cap(b), b.length / 2, d);
    //   const { rune: r, size: z } = decodeRune(d);

    //   const bLen = new TextDecoder().decode(b).length;

    //   if (r != m.r || z != bLen) {
    //     fail(
    //       `DecodeRune: expect ${m.r} but got ${r}, and expect ${bLen} but got ${z}`
    //     );
    //   }
    // }

    {
      const s = m.str + "\x00";

      const { rune: r, size: z } = decodeRune(s);

      const bLen = m.str.length;

      if (r != m.r || z != bLen) {
        fail(
          `DecodeRune: expect ${m.r} but got ${r}, and expect ${bLen} but got ${z}`
        );
      }
    }

    // make sure missing bytes fail
    let wantsize = 1;

    if (wantsize >= bLen) {
      wantsize = 0;
    }

    {
      const { rune: r, size: z } = decodeRune(b.slice(0, b.length - 2));

      if (r != RuneError.charCodeAt(0) || z != wantsize) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${wantsize} but got ${z}`
        );
      }
    }

    {
      const s = m.str.slice(0, m.str.length - 1);

      const { rune: r, size: z } = decodeRune(s);

      if (r != RuneError.charCodeAt(0) || z != wantsize) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${wantsize} but got ${z}`
        );
      }
    }

    // make sure bad sequences fail
    const bb = new Uint8Array(
      new TextDecoder()
        .decode(b)
        .split("")
        .map((v: string) => v.charCodeAt(0))
    );
    if (bb.length == 1) {
      bb[0] = 0x80;
    } else {
      bb[bb.length - 1] = 0x7f;
    }

    {
      const { rune: r, size: z } = decodeRune(bb);

      if (r != RuneError.charCodeAt(0) || z != 1) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${1} but got ${z}`
        );
      }
    }

    {
      const { rune: r, size: z } = decodeRune(new TextDecoder().decode(bb));

      if (r != RuneError.charCodeAt(0) || z != 1) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${1} but got ${z}`
        );
      }
    }
  }
});

test(function utf8DecodeSurrogateRune(): void {
  for (const m of surrogateMap) {
    {
      const b = new TextEncoder().encode(m.str);
      const { rune: r, size: z } = decodeRune(b);

      if (r != RuneError.charCodeAt(0) || z != 1) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${1} but got ${z}`
        );
      }
    }

    {
      const s = m.str;
      const { rune: r, size: z } = decodeRune(s);

      if (r != RuneError.charCodeAt(0) || z != 1) {
        fail(
          `DecodeRune: expect ${RuneError.charCodeAt(
            0
          )} but got ${r}, and expect ${1} but got ${z}`
        );
      }
    }
  }
});

runIfMain(import.meta);
