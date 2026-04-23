import loadingArt from "../assets/myBudget_loading.png";
import { useI18n } from "../i18n";

export function LoadingScreen() {
  const { messages } = useI18n();
  return (
    <div
      className="flex h-[100dvh] min-h-0 w-full flex-col items-center justify-end bg-cover bg-center bg-no-repeat px-6 pb-14"
      style={{
        backgroundColor: "#fdfbe2",
        backgroundImage: `url(${loadingArt})`,
      }}
    >
      <p className="text-sm font-medium text-slate-600">{messages.loading.loading}</p>
    </div>
  );
}
