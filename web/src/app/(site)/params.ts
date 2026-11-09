import { listCategories, listCompanies, listInvestors, listPeople, listPlaces, listStories } from "@/lib/lore";

// Every record page is prebuilt (static export): these list the params of each dynamic segment.
// Pages and their share images re-export them as generateStaticParams.

export const companyParams = async () => (await listCompanies()).map((c) => ({ company: c.slug }));
export const investorParams = async () => (await listInvestors()).map((i) => ({ slug: i.slug }));
export const personParams = async () => (await listPeople()).map((p) => ({ slug: p.slug }));
export const placeParams = async () => (await listPlaces()).map((p) => ({ slug: p.slug }));
export const storyParams = async () => (await listStories()).map((s) => ({ slug: s.slug }));
export const categoryParams = async () => (await listCategories()).map((c) => ({ slug: c.slug }));
