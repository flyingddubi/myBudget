import loadingArt from "../assets/myBudget_loading.png";

export function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-end bg-cover bg-center bg-no-repeat px-6 pb-14"
      style={{
        backgroundColor: "#fdfbe2",
        backgroundImage: `url(${loadingArt})`,
      }}
    >
      <p className="text-sm font-medium text-slate-600">불러오는 중…</p>
    </div>
  );
}
