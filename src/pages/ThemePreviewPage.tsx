
const themes = [
  {
    id: 1,
    name: "Minimal Japan",
    colors: [
      { name: "Negro carbón", hex: "#0D0D0D" },
      { name: "Blanco puro", hex: "#FFFFFF" },
      { name: "Rojo coral japonés", hex: "#E63946" },
      { name: "Gris perla", hex: "#E5E5E5" },
      { name: "Oro suave", hex: "#F2C94C" },
    ],
  },
  {
    id: 3,
    name: "Street Sushi",
    colors: [
      { name: "Negro grafito", hex: "#1C1C1E" },
      { name: "Rojo neón", hex: "#FF3B30" },
      { name: "Gris frío", hex: "#A1A1A1" },
      { name: "Blanco humo", hex: "#F5F5F7" },
      { name: "Verde wasabi", hex: "#A4C639" },
    ],
  },
  {
    id: 4,
    name: "Eco Sushi",
    colors: [
      { name: "Verde matcha", hex: "#7CB518" },
      { name: "Blanco arroz", hex: "#FAF9F6" },
      { name: "Marrón bambú", hex: "#C1A57B" },
      { name: "Negro tinta", hex: "#1E1E1E" },
      { name: "Rojo miso", hex: "#D62828" },
    ],
  },
];

export default function ThemePreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-semibold text-center mb-8">
        🎨 MaiSushi Theme Preview
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="rounded-2xl shadow-lg bg-white border border-gray-200 overflow-hidden"
          >
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {theme.name}
              </h2>
            </div>
            <div className="flex flex-col">
              {theme.colors.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 text-sm font-medium text-gray-700"
                  style={{ backgroundColor: c.hex, color: getTextColor(c.hex) }}
                >
                  <span>{c.name}</span>
                  <span>{c.hex}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Small helper for contrast text color
function getTextColor(hex: string): string {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#1A1A1A" : "#FFFFFF";
}
