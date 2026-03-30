/** General tag categories that group AI-generated tags into user-friendly buckets */

export interface TagCategory {
  name: string;
  icon: string;
  keywords: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    name: "Personal",
    icon: "👤",
    keywords: ["aadhaar", "passport", "pan", "voter", "birth", "death", "marriage", "driving license", "identity", "personal", "resume", "cv", "photograph", "selfie", "vehicle registration", "hsrp", "motorcycle", "appointment"],
  },
  {
    name: "Finance",
    icon: "💰",
    keywords: ["invoice", "gst", "tax", "payment", "receipt", "bank", "financial", "investment", "salary", "income", "expense", "budget", "loan", "emi", "credit", "debit", "account", "returns", "capital", "stamp duty", "deposit", "electricity charges", "license fee", "maintenance charges", "stipend", "payment receipt", "payment gateway"],
  },
  {
    name: "Legal",
    icon: "⚖️",
    keywords: ["contract", "agreement", "legal", "law", "court", "affidavit", "notary", "deed", "power of attorney", "compliance", "terms and conditions", "leave and license", "property rental", "rent control", "maharashtra rent"],
  },
  {
    name: "Office",
    icon: "🏢",
    keywords: ["offer letter", "employment", "hr", "human resources", "recruitment", "company", "corporate", "business", "meeting", "memo", "policy", "report", "project", "staff", "training", "internship", "job offer", "designation", "business meet", "formal event"],
  },
  {
    name: "Government",
    icon: "🏛️",
    keywords: ["government", "setu", "nic", "e-setu", "public services", "citizen", "municipal", "collectorate", "department", "registration and stamps", "government compliance", "government project", "digital governance", "maharashtra"],
  },
  {
    name: "Technology",
    icon: "💻",
    keywords: ["api", "cloud", "software", "technology", "development", "data", "analytics", "automation", "ocr", "nlp", "ai", "platform", "infrastructure", "web development", "ats", "resume parser", "skill matching", "data science"],
  },
  {
    name: "Insurance",
    icon: "🛡️",
    keywords: ["insurance", "health", "medical", "hospital", "claim", "premium", "policy", "life insurance", "coverage"],
  },
  {
    name: "Education",
    icon: "🎓",
    keywords: ["certificate", "degree", "marksheet", "school", "college", "university", "education", "student", "academic", "project completion", "completion certificate"],
  },
  {
    name: "Real Estate",
    icon: "🏠",
    keywords: ["real estate", "property", "residential", "plot", "flat", "house", "rental", "lease", "tenant", "landlord", "registration"],
  },
  {
    name: "Other",
    icon: "📁",
    keywords: [],
  },
];

/** Categorize a tag name into a general category */
export function categorizeTag(tagName: string): string {
  const lower = tagName.toLowerCase();
  for (const cat of TAG_CATEGORIES) {
    if (cat.name === "Other") continue;
    if (cat.keywords.some((kw) => lower.includes(kw) || kw.includes(lower))) {
      return cat.name;
    }
  }
  return "Other";
}

/** Group tags into categories, returning category → tag names mapping */
export function groupTagsByCategory(tags: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const tag of tags) {
    const cat = categorizeTag(tag);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tag);
  }
  return grouped;
}
