// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Package utf8 implements functions and constants to support text encoded in
// UTF-8. It includes functions to translate between runes and UTF-8 byte sequences.
// See https://en.wikipedia.org/wiki/UTF-8

// The conditions RuneError==unicode.ReplacementChar and
// MaxRune==unicode.MaxRune are verified in the tests.
// Defining them locally avoids this package depending on package unicode.

// Numbers fundamental to the encoding.
export const RuneError = "\uFFFD"; // the "error" Rune or "Unicode replacement character"
export const RuneSelf = 0x80; // characters below Runeself are represented as themselves in a single byte.
export const MaxRune = "\u0010FFFF"; // characters below Runeself are represented as themselves in a single byte.
export const UTFMax = 4; // maximum number of bytes of a UTF-8 encoded Unicode character.

// Code points in the surrogate range are not valid for UTF-8.
const surrogateMin = 0xd800;
const surrogateMax = 0xdfff;

const t1 = 0b00000000;
const tx = 0b10000000;
const t2 = 0b11000000;
const t3 = 0b11100000;
const t4 = 0b11110000;
const t5 = 0b11111000;

const maskx = 0b00111111;
const mask2 = 0b00011111;
const mask3 = 0b00001111;
const mask4 = 0b00000111;

const rune1Max = 1 << (7 - 1);
const rune2Max = 1 << (11 - 1);
const rune3Max = 1 << (16 - 1);

// The default lowest and highest continuation byte.
const locb = 0b10000000;
const hicb = 0b10111111;

// These names of these constants are chosen to give nice alignment in the
// table below. The first nibble is an index into acceptRanges or F for
// special one-byte cases. The second nibble is the Rune length or the
// Status for the special one-byte case.
const xx = 0xf1; // invalid: size 1
const as = 0xf0; // ASCII: size 1
const s1 = 0x02; // accept 0, size 2
const s2 = 0x13; // accept 1, size 3
const s3 = 0x03; // accept 0, size 3
const s4 = 0x23; // accept 2, size 3
const s5 = 0x34; // accept 3, size 4
const s6 = 0x04; // accept 0, size 4
const s7 = 0x44; // accept 4, size 4

// prettier-ignore
const first = new Uint8Array([
  	//   1   2   3   4   5   6   7   8   9   A   B   C   D   E   F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x00-0x0F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x10-0x1F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x20-0x2F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x30-0x3F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x40-0x4F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x50-0x5F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x60-0x6F
	as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, as, // 0x70-0x7F
	//   1   2   3   4   5   6   7   8   9   A   B   C   D   E   F
	xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, // 0x80-0x8F
	xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, // 0x90-0x9F
	xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, // 0xA0-0xAF
	xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, // 0xB0-0xBF
	xx, xx, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, // 0xC0-0xCF
	s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, s1, // 0xD0-0xDF
	s2, s3, s3, s3, s3, s3, s3, s3, s3, s3, s3, s3, s3, s4, s3, s3, // 0xE0-0xEF
	s5, s6, s6, s6, s7, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, xx, // 0xF0-0xFF
])

// acceptRange gives the range of valid values for the second byte in a UTF-8
// sequence.
interface acceptRange {
  lo: number; // lowest value for second byte.
  hi: number; // highest value for second byte.
}

// acceptRanges has size 16 to avoid bounds checks in the code that uses it.
const acceptRanges: acceptRange[] = [
  { lo: locb, hi: hicb },
  { lo: 0xa0, hi: hicb },
  { lo: locb, hi: 0x9f },
  { lo: 0x90, hi: hicb },
  { lo: locb, hi: 0x8f }
];

// FullRune reports whether the bytes in p begin with a full UTF-8 encoding of a rune.
// An invalid encoding is considered a full Rune since it will convert as a width-1 error rune.

export function fullRune(p: Uint8Array): boolean {
  const n = p.length;
  if (n === 0) {
    return false;
  }

  const x = first[p[0]];
  if (n >= (x & 7)) {
    return true; // ASCII, invalid or valid.
  }
  // Must be short or invalid.
  const accept = acceptRanges[x >> 4];

  if (n > 1 && (p[1] < accept.lo || accept.hi < p[1])) {
    return true;
  } else if (n > 2 && (p[2] < locb || hicb < p[2])) {
    return true;
  }

  return false;
}

// FullRuneInString is like FullRune but its input is a string.
export function fullRuneInString(s: string): boolean {
  const n = s.length;
  if (n === 0) {
    return false;
  }

  const x = first[s[0]];
  if (n >= (x & 7)) {
    return true; // ASCII, invalid or valid.
  }
  // Must be short or invalid.
  const accept = acceptRanges[x >> 4];

  if (
    n > 1 &&
    (s[1].charCodeAt(0) < accept.lo || accept.hi < s[1].charCodeAt(0))
  ) {
    return true;
  } else if (
    n > 2 &&
    (s[2].charCodeAt(0) < locb || hicb < s[2].charCodeAt(0))
  ) {
    return true;
  }

  return false;
}
