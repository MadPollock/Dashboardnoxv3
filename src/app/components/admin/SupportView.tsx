import React from 'react';
import { ExternalLink, MessageCircle, BookOpen, Rocket, Lightbulb, FileQuestion } from 'lucide-react';
import { Button } from '../ui/button';
import { useStrings } from '../../hooks/useStrings';

interface ResourceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function ResourceCard({ title, description, icon, href }: ResourceCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-card rounded-md p-6 border border-border hover:border-primary/20 transition-all hover:shadow-lg hover:scale-[1.02] duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
              {title}
            </h3>
            <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}

export function SupportView() {
  const { t } = useStrings();

  const handleWhatsAppClick = () => {
    const phoneNumber = '5511975407394'; // Format: country code + number without special chars
    const message = encodeURIComponent(t('support.whatsapp.defaultMessage'));
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const resources = [
    {
      title: t('support.resources.faq.title'),
      description: t('support.resources.faq.description'),
      icon: <FileQuestion className="size-6 text-primary" />,
      href: '#', // TODO: Add actual FAQ URL
    },
    {
      title: t('support.resources.quickStart.title'),
      description: t('support.resources.quickStart.description'),
      icon: <Rocket className="size-6 text-primary" />,
      href: '#', // TODO: Add actual Quick Start URL
    },
    {
      title: t('support.resources.advancedGuide.title'),
      description: t('support.resources.advancedGuide.description'),
      icon: <BookOpen className="size-6 text-primary" />,
      href: '#', // TODO: Add actual Advanced Guide URL
    },
    {
      title: t('support.resources.usageTips.title'),
      description: t('support.resources.usageTips.description'),
      icon: <Lightbulb className="size-6 text-primary" />,
      href: '#', // TODO: Add actual Usage Tips URL
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
            {t('support.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('support.subtitle')}
          </p>
        </div>

        {/* WhatsApp CTA */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-md p-6 border border-green-200 dark:border-green-900">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="size-14 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="size-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold mb-1" style={{ fontFamily: 'Manrope' }}>
                {t('support.whatsapp.title')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('support.whatsapp.description')}
              </p>
            </div>
            <Button
              onClick={handleWhatsAppClick}
              className="bg-green-500 hover:bg-green-600 text-white w-full md:w-auto"
            >
              <MessageCircle className="size-4 mr-2" />
              {t('support.whatsapp.cta')}
            </Button>
          </div>
        </div>

        {/* Resources Grid */}
        <div>
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
            {t('support.resources.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource, index) => (
              <ResourceCard key={index} {...resource} />
            ))}
          </div>
        </div>

        {/* Additional Help Text */}
        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-muted-foreground">
            {t('support.footer.text')}{' '}
            <button
              onClick={handleWhatsAppClick}
              className="text-primary hover:underline font-medium"
            >
              {t('support.footer.link')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}