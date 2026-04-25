import { TemplatesModal } from "./TemplatesModal";
import { ReadingModeModal } from "@/workshop/reading/ReadingModeModal";
import { ShareModal, ViewSharedPoem } from "@/workshop/sharing/ShareModal";
import type { SharedPoem } from "@/workshop/sharing/sharing";

interface WorkshopModalsProps {
  // Templates
  isTemplatesOpen: boolean;
  onCloseTemplates: () => void;
  onInsertTemplate: (body: string, form: string) => void;
  // Reading mode
  isReadingMode: boolean;
  onCloseReadingMode: () => void;
  title: string;
  formNote: string;
  body: string;
  // Share
  isShareOpen: boolean;
  onCloseShare: () => void;
  // Shared poem view
  sharedPoemView: SharedPoem | null;
  onDismissSharedPoem: () => void;
  onAddSharedPoemToDrafts: (poem: SharedPoem) => void;
}

export function WorkshopModals({
  isTemplatesOpen, onCloseTemplates, onInsertTemplate,
  isReadingMode, onCloseReadingMode, title, formNote, body,
  isShareOpen, onCloseShare,
  sharedPoemView, onDismissSharedPoem, onAddSharedPoemToDrafts,
}: WorkshopModalsProps) {
  return (
    <>
      {isTemplatesOpen && (
        <TemplatesModal
          onClose={onCloseTemplates}
          onInsert={onInsertTemplate}
        />
      )}

      {isReadingMode && (
        <ReadingModeModal
          title={title}
          formNote={formNote}
          body={body}
          onClose={onCloseReadingMode}
        />
      )}

      {isShareOpen && (
        <ShareModal
          poem={{ title, body }}
          onClose={onCloseShare}
        />
      )}

      {sharedPoemView && (
        <ViewSharedPoem
          poem={sharedPoemView}
          onDismiss={onDismissSharedPoem}
          onAddToDrafts={() => onAddSharedPoemToDrafts(sharedPoemView)}
        />
      )}
    </>
  );
}
