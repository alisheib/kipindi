import { BrandSpinner } from "@/components/brand";

export default function Loading() {
  return (
    <div className="grid place-items-center py-16">
      <BrandSpinner size={40} />
    </div>
  );
}

