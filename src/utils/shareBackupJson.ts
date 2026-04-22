import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * 웹: Blob 다운로드 또는 Web Share API(파일).
 * 네이티브(Capacitor): 캐시에 JSON 저장 후 공유 시트로 저장·전달.
 */
export async function shareBackupJson(json: string, dateStamp: string): Promise<void> {
  const webFileName = `가계부-백업-${dateStamp}.json`;
  const cacheFileName = `mybudget-backup-${dateStamp}.json`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: cacheFileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: cacheFileName,
    });

    await Share.share({
      title: `가계부 백업 (${dateStamp})`,
      text: webFileName,
      url: uri,
      dialogTitle: "백업 저장·공유",
    });
    return;
  }

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const file = new File([blob], webFileName, {
      type: "application/json",
    });
    const shareData: ShareData = { files: [file], title: "가계부 백업" };
    try {
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "AbortError") {
        return;
      }
    }
  }

  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = webFileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
