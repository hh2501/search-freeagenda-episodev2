import HomePageClient from "./components/HomePageClient";

export const revalidate = 60;

export default function Home() {
  return <HomePageClient />;
}
