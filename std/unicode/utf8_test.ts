// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.

import { fullRune, fullRuneInString } from "./utf8.ts";
import { test, runIfMain } from "../testing/mod.ts";
import { assertEquals, assertThrows } from "../testing/asserts.ts";

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
  let index = 0;
  for (const m of utf8map) {
    const b = new TextEncoder().encode(m.str);

    assertEquals(fullRune(b), true);

    const s = m.str;
    assertEquals(fullRuneInString(s), true);

    const b1 = b.slice(0, b.length - 1);
    console.log(b1, b, index);
    assertEquals(fullRune(b1), false);
    index++;
  }
});

runIfMain(import.meta);
