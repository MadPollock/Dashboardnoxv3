import React from 'react';
import { WithdrawalRequestForm } from '../components/admin/WithdrawalRequestForm';
import { AlertCircle } from 'lucide-react';
import { Banner } from '../components/ui/banner';
import { useStrings } from '../hooks/useStrings';

export function WithdrawView() {
  const { t } = useStrings();
  
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div>
        <h1 style={{ fontFamily: 'Manrope' }}>{t('withdraw.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('withdraw.subtitle')}
        </p>
      </div>

      <Banner
        variant="warning"
        icon={AlertCircle}
        title={t('withdraw.banner.title')}
        description={t('withdraw.banner.description')}
      />

      <WithdrawalRequestForm />
    </div>
  );
}