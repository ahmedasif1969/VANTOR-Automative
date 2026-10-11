export type Category = "Performance" | "Luxury" | "Supercars";
export type SortOrder = "curated" | "price-asc" | "price-desc" | "name";
export type Preference = "Performance" | "Luxury" | "Everyday refinement";
export interface Vehicle {
  id: string;
  name: string;
  category: Category;
  year: number;
  price: number;
  image: string;
  imagePosition?: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  description: string;
}

// Example used-car prices, not live listings or valuations. Photography illustrates the model.
export const vehicles: Vehicle[] = [
  {
    id: "gt3",
    name: "Porsche 911 GT3",
    category: "Performance",
    year: 2022,
    price: 219000,
    image: "/images/gt3.jpg",
    engine: "4.0L naturally aspirated flat-six",
    transmission: "7-speed PDK",
    drivetrain: "Rear-wheel drive",
    description:
      "The 992.1 GT3 distils motorsport into a road car: a naturally aspirated flat-six, a double-wishbone front axle, and an unmistakable swan-neck rear wing. Our fictional showcase specifies the US-market PDK variant.",
  },
  {
    id: "panamera",
    name: "Porsche Panamera Turbo",
    category: "Luxury",
    year: 2017,
    price: 79000,
    image: "/images/porsche.jpg",
    engine: "4.0L twin-turbo V8",
    transmission: "8-speed PDK",
    drivetrain: "All-wheel drive",
    description:
      "Long-distance composure with a distinctly sporting centre of gravity. A four-door grand tourer for journeys that deserve as much attention as the destination.",
  },
  {
    id: "huracan",
    name: "Lamborghini Huracán LP 610-4",
    category: "Supercars",
    year: 2016,
    price: 189000,
    image: "/images/supercar.jpg",
    engine: "5.2L naturally aspirated V10",
    transmission: "7-speed dual-clutch",
    drivetrain: "All-wheel drive",
    description:
      "Sculptural, immediate, and unapologetically theatrical. A naturally aspirated V10 and all-wheel-drive chassis make every journey feel like an occasion.",
  },
  {
    id: "720s",
    name: "McLaren 720S",
    category: "Supercars",
    year: 2018,
    price: 209000,
    image: "/images/performance.jpg",
    engine: "4.0L twin-turbo V8",
    transmission: "7-speed dual-clutch",
    drivetrain: "Rear-wheel drive",
    description:
      "Carbon-fibre architecture and striking aerodynamic form, with the delicacy of a car built around its driver. Effortless pace meets extraordinary precision.",
  },
  {
    id: "s5",
    name: "Audi S5 Coupé",
    category: "Luxury",
    year: 2010,
    price: 21000,
    image: "/images/grand-tourer.jpg",
    imagePosition: "center 68%",
    engine: "4.2L naturally aspirated V8",
    transmission: "6-speed Tiptronic automatic",
    drivetrain: "Quattro all-wheel drive",
    description:
      "Everyday refinement without losing the pleasure of a clear stretch of road. A quietly capable coupé, balancing comfort, confident traction, and a carefully considered cabin.",
  },
  {
    id: "mustang",
    name: "Ford Mustang GT",
    category: "Performance",
    year: 2017,
    price: 35000,
    image: "/images/mustang.jpg",
    engine: "5.0L naturally aspirated V8",
    transmission: "6-speed manual",
    drivetrain: "Rear-wheel drive",
    description:
      "A timeless fastback silhouette and a naturally aspirated V8. An analogue choice for drivers who value character, a manual gearbox, and a connection to the road.",
  },
];

export const vehicleNames = vehicles.map((vehicle) => vehicle.name);
export const featuredVehicle = vehicles[0];
export const gt3SpecificationSource =
  "https://newsroom.porsche.com/en_US/2021/products/porsche-911-gt3-motorsport-technology-world-premiere-23656.html";
export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function filterVehicles(
  category: Category | "All Vehicles",
  order: SortOrder,
) {
  const result = vehicles.filter(
    (vehicle) => category === "All Vehicles" || vehicle.category === category,
  );
  if (order === "price-asc") result.sort((a, b) => a.price - b.price);
  if (order === "price-desc") result.sort((a, b) => b.price - a.price);
  if (order === "name") result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export function recommendVehicle(preference: Preference) {
  const id =
    preference === "Performance"
      ? "gt3"
      : preference === "Luxury"
        ? "panamera"
        : "s5";
  return vehicles.find((vehicle) => vehicle.id === id)!;
}
