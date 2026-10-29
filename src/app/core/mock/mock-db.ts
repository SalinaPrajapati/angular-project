import { DEMO_USERS } from "../demo-users";
import { ApplicationFormValue, ApplicationStatus, RiskEvent } from "../models";

export interface StoredApplication {
  id: string;
  status: ApplicationStatus;
  ownerId: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  value: ApplicationFormValue;
  riskHistory: RiskEvent[];
}

const DB_KEY = "angular-app.mock-db";

export function emptyValue(): ApplicationFormValue {
  return {
    business: {
      legalName: "",
      registrationNumber: "",
      businessType: "",
      website: "",
    },
    contact: { fullName: "", email: "", phone: "" },
    financial: {
      monthlyVolume: null,
      averageTicket: null,
      bankAccountNumber: "",
      taxId: "",
    },
  };
}

export function loadDb(): StoredApplication[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      return JSON.parse(raw) as StoredApplication[];
    }
  } catch {
    console.log("print")
  }
  return seedApplications();
}

export function saveDb(applications: StoredApplication[]): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(applications));
  } catch {
    console.log("print")
  }
}

const NAMES = [
  "Northwind Coffee Roasters",
  "Bluebird Bakery",
  "Harbor Light Hardware",
  "Maple & Main Florist",
  "Summit Outdoor Supply",
  "Evergreen Pet Care",
  "Copper Kettle Diner",
  "Riverbend Bookshop",
  "Urban Loom Textiles",
  "Golden Hour Photography",
  "Pinecrest Dental Studio",
  "Atlas Freight Partners",
  "Juniper Home Decor",
  "Cobalt Cycle Works",
  "Saffron Table Catering",
  "Lighthouse Learning Center",
  "Redwood Furniture Co",
  "Sparrow Stationery",
  "Willow Yoga Collective",
  "Ironwood Auto Repair",
  "Orchard Lane Grocers",
  "Tidewater Seafood",
  "Foxglove Garden Center",
  "Quartz Jewelry Studio",
  "Meridian Print Shop",
  "Starling Toy Emporium",
  "Larkspur Candle Works",
  "Basalt Climbing Gym",
];

const TYPES = ["retail", "restaurant", "services", "ecommerce"];
const CYCLE: ApplicationStatus[] = [
  "approved",
  "in_review",
  "submitted",
  "draft",
  "rejected",
  "in_review",
  "submitted",
];

export function seedApplications(): StoredApplication[] {
  const sales = DEMO_USERS.filter((u) => u.role === "sales");
  const reviewers = DEMO_USERS.filter((u) => u.role === "reviewer");
  const admin = DEMO_USERS.find((u) => u.role === "admin")!;
  const now = Date.now();

  return NAMES.map((name, i): StoredApplication => {
    const status = CYCLE[i % CYCLE.length];
    const owner = sales[i % sales.length];
    const reviewer = reviewers[i % reviewers.length];
    const assigned =
      status === "in_review" || status === "approved" || status === "rejected";
    const created = now - (i + 1) * 9 * 3_600_000;
    const at = (hoursAfter: number) =>
      new Date(created + hoursAfter * 3_600_000).toISOString();
    const first = name.split(" ")[0];

    const value = emptyValue();
    value.business.legalName = name;
    value.contact.fullName = `${first} Owner`;
    if (status !== "draft") {
      value.business.registrationNumber = `REG-${100000 + i * 37}`;
      value.business.businessType = TYPES[i % TYPES.length];
      value.business.website = `https://www.${first.toLowerCase()}.example.com`;
      value.contact.email = `owner@${first.toLowerCase()}.example.com`;
      value.contact.phone = `+1 555 010 ${String(2000 + i).slice(-4)}`;
      value.financial.monthlyVolume = 20_000 + i * 3_500;
      value.financial.averageTicket = 35 + i * 4;
      value.financial.bankAccountNumber = String(
        40_000_000 + i * 7_919,
      ).padStart(10, "0");
      value.financial.taxId = `12-${String(3_456_789 + i * 11).slice(0, 7)}`;
    }

    const riskHistory: RiskEvent[] = [];
    if (status !== "draft") {
      riskHistory.push({
        id: `${i}-1`,
        at: at(1),
        actor: owner.name,
        action: "Application submitted",
      });
    }
    if (assigned) {
      riskHistory.push({
        id: `${i}-2`,
        at: at(3),
        actor: admin.name,
        action: `Assigned to ${reviewer.name}`,
      });
    }
    if (status === "approved" || status === "rejected") {
      riskHistory.push({
        id: `${i}-3`,
        at: at(6),
        actor: reviewer.name,
        action: status === "approved" ? "Approved" : "Rejected",
        riskLevel: status === "approved" ? "low" : "high",
        note:
          status === "approved"
            ? "Documents verified; volumes match the stated profile."
            : "Registration number could not be verified.",
      });
    }

    return {
      id: `app-${String(i + 1).padStart(3, "0")}`,
      status,
      ownerId: owner.id,
      assignedToId: assigned ? reviewer.id : null,
      createdAt: at(0),
      updatedAt: at(status === "draft" ? 0 : 6),
      value,
      riskHistory,
    };
  });
}
