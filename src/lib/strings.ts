// Fixed safety wording and the Bangla lines used on the printed notice.
// The Bangla text is machine-translated and has NOT been reviewed by a native speaker.
// It is shown only on the demo notice, always with that label.

export const SAFETY_NOTE =
  "Readings are field-kit values and can be wrong. 50 \u00b5g/L is Bangladesh's limit; WHO's guideline is 10 \u00b5g/L. An untested well is not a safe well. This is not a water-quality certificate or medical advice."

export const FIELD_CHECK = "Candidates only. Ask the owner's permission and check the real path on the ground."

export const MT_LABEL = 'Machine-translated, not reviewed by a native speaker'
export const DEMO_MARK = 'DEMO \u2013 not for distribution'

export const CITATION =
  'BGS and DPHE. 2001. Arsenic contamination of groundwater in Bangladesh. Kinniburgh, D G, and Smedley, P L (editors). British Geological Survey Technical Report WC/00/19. (Nottingham, UK: British Geological Survey.)'

export const ACKNOWLEDGEMENT =
  'This material was produced by the British Geological Survey and the Department of Public Health Engineering (Bangladesh) undertaking a project funded by the UK Department for International Development (DFID). Any views expressed are not necessarily those of DFID.'

export const DIR_EN = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
export const DIR_BN = ['উত্তর', 'উত্তর-পূর্ব', 'পূর্ব', 'দক্ষিণ-পূর্ব', 'দক্ষিণ', 'দক্ষিণ-পশ্চিম', 'পশ্চিম', 'উত্তর-পশ্চিম']

export const BN = {
  title: 'আর্সেনিক নলকূপ নোটিশ',
  yourWell: 'আপনার নলকূপ',
  reading: 'ফিল্ড কিটের পরিমাপ',
  candidate: 'সম্ভাব্য নলকূপ',
  switchLine: (id: string, dir: string, dist: number, k: number, k0: number) =>
    `সম্ভাব্য নলকূপ: ${id}, ${dir} দিকে প্রায় ${dist} মিটার। ওই নলকূপের পরিমাপ ${k} µg/L, আপনার নলকূপের ${k0} µg/L।`,
  stillAbove: 'কম, কিন্তু এখনও সীমার উপরে।',
  keep: 'এই নলকূপের পরিমাপ বাংলাদেশের সীমা 50 µg/L বা তার নিচে। কোনো পরিবর্তনের প্রস্তাব নেই।',
  aboveWho: 'তবে এটি বিশ্ব স্বাস্থ্য সংস্থার নির্দেশিকা 10 µg/L-এর উপরে।',
  noOption: (d: number) =>
    `এই নলকূপের পরিমাপ সীমার উপরে। ${d} মিটারের মধ্যে অর্ধেক বা তার কম পরিমাপের কোনো নলকূপ পাওয়া যায়নি। আরও দূরে খোঁজ করুন অথবা অন্য পানির উৎসের কথা জিজ্ঞাসা করুন।`,
  untested: 'এই নলকূপ পরীক্ষা করা হয়নি। আগে পরীক্ষা করুন। পরীক্ষা না করা নলকূপ নিরাপদ নলকূপ নয়।',
  before: 'বদলানোর আগে: মালিকের অনুমতি নিন এবং আসল পথ যাচাই করুন।',
  caveat: 'এই পরিমাপ ফিল্ড কিটের এবং ভুল হতে পারে। এটি পানির মানের সনদ বা চিকিৎসা পরামর্শ নয়।',
}
