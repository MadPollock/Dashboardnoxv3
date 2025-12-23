import React, { useState, useRef } from 'react';
import { Shield, Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Banner } from '../ui/banner';
import { Textarea } from '../ui/textarea';
import { useStrings } from '../../hooks/useStrings';

interface DefenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (defenseText: string, attachments: string[]) => void;
  disputeId: string;
  minChars?: number;
  maxChars?: number;
  maxAttachments?: number;
  maxFileSize?: number; // in bytes
}

/**
 * DefenseFormModal - Form to submit merchant defense for a dispute
 * Collects defense text and optional file attachments
 */
export function DefenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  disputeId,
  minChars = 50,
  maxChars = 2000,
  maxAttachments = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
}: DefenseFormModalProps) {
  const { t } = useStrings();
  const [defenseText, setDefenseText] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; dataUri: string; size: number }>>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total number of attachments
    if (attachments.length + files.length > maxAttachments) {
      setError(t('disputes.defense.tooManyFiles', { max: maxAttachments }));
      return;
    }

    const newAttachments: Array<{ name: string; dataUri: string; size: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > maxFileSize) {
        setError(t('disputes.defense.fileTooLarge', { name: file.name, max: '10MB' }));
        return;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError(t('disputes.defense.invalidFileType', { name: file.name }));
        return;
      }

      // Convert to base64 data URI
      try {
        const dataUri = await fileToDataUri(file);
        newAttachments.push({
          name: file.name,
          dataUri,
          size: file.size,
        });
      } catch (err) {
        setError(t('disputes.defense.fileReadError', { name: file.name }));
        return;
      }
    }

    setAttachments([...attachments, ...newAttachments]);
    setError('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    setError('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = () => {
    // Validation
    if (!defenseText.trim()) {
      setError(t('disputes.defense.textRequired'));
      return;
    }

    if (defenseText.trim().length < minChars) {
      setError(t('disputes.defense.textTooShort', { min: minChars }));
      return;
    }

    if (defenseText.length > maxChars) {
      setError(t('disputes.defense.textTooLong', { max: maxChars }));
      return;
    }

    setIsSubmitting(true);
    const attachmentDataUris = attachments.map(a => a.dataUri);
    onSubmit(defenseText.trim(), attachmentDataUris);
  };

  const handleClose = () => {
    setDefenseText('');
    setAttachments([]);
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
                {t('disputes.defense.title')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('disputes.defense.subtitle', { id: disputeId })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Info Banner */}
          <Banner
            variant="info"
            icon={AlertCircle}
            title={t('disputes.defense.infoTitle')}
            description={t('disputes.defense.infoMessage')}
          />

          {/* Defense Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ fontFamily: 'Manrope' }}>
              {t('disputes.defense.textLabel')} <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={defenseText}
              onChange={(e) => {
                setDefenseText(e.target.value);
                setError('');
              }}
              placeholder={t('disputes.defense.textPlaceholder')}
              className="min-h-[200px] resize-none"
              maxLength={maxChars}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {t('disputes.defense.textHint', { min: minChars })}
              </p>
              <span className="text-xs text-muted-foreground">
                {defenseText.length}/{maxChars}
              </span>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ fontFamily: 'Manrope' }}>
                {t('disputes.defense.attachmentsLabel')}
              </label>
              <span className="text-xs text-muted-foreground">
                {t('disputes.defense.attachmentsOptional')}
              </span>
            </div>

            {/* File Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting || attachments.length >= maxAttachments}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || attachments.length >= maxAttachments}
                className="w-full"
              >
                <Upload className="size-4 mr-2" />
                {t('disputes.defense.uploadButton')}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('disputes.defense.uploadHint', { max: maxAttachments })}
              </p>
            </div>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttachment(index)}
                      disabled={isSubmitting}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('disputes.defense.cancel')}
          </Button>
          <Button
            variant="write"
            onClick={handleSubmit}
            disabled={!defenseText.trim() || defenseText.trim().length < minChars || isSubmitting}
          >
            <Shield className="size-4 mr-2" />
            {isSubmitting ? t('disputes.defense.submitting') : t('disputes.defense.submit')}
          </Button>
        </div>
      </div>
    </>
  );
}