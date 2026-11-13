interface CardProps {
  title: string;
  description: string;
}

export default function Card({ title, description }: CardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-black">{title}</h3>
      <p className="mt-1 text-sm text-gray-700">{description}</p>
    </div>
  );
}
