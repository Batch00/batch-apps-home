// Names for the region codes in the public YTD payload: ISO 3166-1 alpha-2 for countries,
// USPS codes for US states. Shared by the home YTD section and the wrap, so keep it small.

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "Washington, DC", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", AS: "American Samoa", GU: "Guam",
  MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "US Virgin Islands",
};

// US states share a namespace with countries on the dot map, and several USPS codes are also
// ISO country codes (CA, MN, LA, GA, AL, AZ, TN...), so a state is always keyed as "US-XX".
export const stateKey = (code) => `US-${code}`;

let displayNames = null;

export function countryName(code) {
  try {
    displayNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function stateName(code) {
  return STATES[code] ?? code;
}

// "A", "A and B", "A, B and C".
export function listOf(words) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

// This year's new places in a readable order: countries in the order the trips first reached
// them (then any others by name), states by name.
export function newPlaces(data) {
  const travel = data?.travel ?? {};
  const fresh = new Set(travel.new_countries ?? []);
  const countries = [];
  for (const trip of travel.trips ?? []) {
    for (const stop of trip.stops ?? []) {
      if (fresh.has(stop.country_code) && !countries.includes(stop.country_code)) countries.push(stop.country_code);
    }
  }
  const rest = [...fresh].filter((c) => !countries.includes(c)).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const states = [...new Set(travel.new_us_states ?? [])].sort((a, b) => stateName(a).localeCompare(stateName(b)));
  return { countries: [...countries, ...rest], states };
}
