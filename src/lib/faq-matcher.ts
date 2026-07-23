import { FAQS, type FAQ } from "./faq-data";

// Minimal English stopwords (NLP-style preprocessing)
const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","am","do","does","did",
  "have","has","had","of","in","on","at","to","for","with","by","from","as","and",
  "or","but","if","then","so","than","that","this","these","those","it","its","i",
  "you","your","we","our","they","their","he","she","him","her","his","hers","me",
  "my","mine","us","them","what","which","who","whom","how","when","where","why",
  "can","could","should","would","will","shall","may","might","must","not","no",
  "yes","about","into","over","under","up","down","out","off","just","also","too",
  "s","t","d","ll","re","ve","m"
]);

// Simple Porter-lite suffix stripper (tokenize/clean/stem)
function stem(word: string): string {
  let w = word;
  const suffixes = ["ingly","edly","ing","ies","ied","ies","ness","ment","ions","ion","ers","er","est","ed","es","ly","s"];
  for (const s of suffixes) {
    if (w.length > s.length + 2 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
}

// Build TF-IDF index over the FAQ corpus
type Doc = { faq: FAQ; tf: Map<string, number>; norm: number };

function buildIndex() {
  const docs: { faq: FAQ; tokens: string[] }[] = FAQS.map((faq) => ({
    faq,
    // Include both question + answer so wording in either helps matching
    tokens: tokenize(faq.question + " " + faq.answer),
  }));

  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log((N + 1) / (c + 1)) + 1);

  const indexed: Doc[] = docs.map(({ faq, tokens }) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    // tf-idf weighted vector
    let norm = 0;
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * (idf.get(t) ?? 0);
      tf.set(t, w);
      norm += w * w;
    }
    return { faq, tf, norm: Math.sqrt(norm) || 1 };
  });

  return { indexed, idf };
}

const INDEX = buildIndex();

export type Match = { faq: FAQ; score: number };

export function findBestMatch(query: string): Match | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  const qtf = new Map<string, number>();
  for (const t of tokens) qtf.set(t, (qtf.get(t) ?? 0) + 1);
  let qnorm = 0;
  const qvec = new Map<string, number>();
  for (const [t, c] of qtf) {
    const w = (1 + Math.log(c)) * (INDEX.idf.get(t) ?? 0);
    qvec.set(t, w);
    qnorm += w * w;
  }
  qnorm = Math.sqrt(qnorm) || 1;

  let best: Match | null = null;
  for (const doc of INDEX.indexed) {
    let dot = 0;
    for (const [t, w] of qvec) {
      const dw = doc.tf.get(t);
      if (dw) dot += w * dw;
    }
    const score = dot / (qnorm * doc.norm);
    if (!best || score > best.score) best = { faq: doc.faq, score };
  }
  return best;
}
