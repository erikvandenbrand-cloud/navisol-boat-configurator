'use client';

import { useState } from 'react';
import { Mail, Send, Copy, Check, ExternalLink, Paperclip } from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency, formatEuroDate, calculateLineTotal, calculateVAT, generateQuotationNumber } from '@/lib/formatting';
import type { BoatConfiguration, Client, GlobalSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

interface EmailQuotationProps {
  open: boolean;
  onClose: () => void;
  configuration: BoatConfiguration;
  client?: Client | null;
  quotationNumber?: string;
}

export function EmailQuotation({ open, onClose, configuration, client, quotationNumber }: EmailQuotationProps) {
  const { settings } = useNavisol();
  const isNL = settings.language === 'nl';

  const [recipientEmail, setRecipientEmail] = useState(client?.email || '');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  // Calculate totals
  const includedItems = configuration.items.filter(i => i.included);
  let subtotal = 0;
  for (const item of includedItems) {
    subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
  }
  const vatAmount = calculateVAT(subtotal, settings.vat_rate);
  const total = subtotal + vatAmount;

  const qNumber = quotationNumber || generateQuotationNumber();

  // Generate default subject and message
  const getDefaultSubject = () => {
    if (isNL) {
      return `Offerte ${qNumber} - ${configuration.boat_model} ${configuration.propulsion_type}`;
    }
    return `Quotation ${qNumber} - ${configuration.boat_model} ${configuration.propulsion_type}`;
  };

  const getDefaultMessage = () => {
    const clientName = client?.company_name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || (isNL ? 'Geachte klant' : 'Dear Customer');

    if (isNL) {
      return `Beste ${clientName},

Hierbij ontvangt u de offerte voor uw ${configuration.boat_model} met ${configuration.propulsion_type.toLowerCase()} voortstuwing.

Configuratie: ${configuration.name}
Totaalbedrag: ${formatEuroCurrency(total)} (incl. BTW)

De offerte is ${settings.quotation_validity_days} dagen geldig.

Heeft u vragen of wilt u de configuratie bespreken? Neem gerust contact met ons op.

Met vriendelijke groet,

${settings.company_name}
${settings.company_address}
Tel: ${settings.company_phone}
E-mail: ${settings.company_email}`;
    }

    return `Dear ${clientName},

Please find attached the quotation for your ${configuration.boat_model} with ${configuration.propulsion_type.toLowerCase()} propulsion.

Configuration: ${configuration.name}
Total Amount: ${formatEuroCurrency(total)} (incl. VAT)

This quotation is valid for ${settings.quotation_validity_days} days.

If you have any questions or would like to discuss the configuration, please don't hesitate to contact us.

Kind regards,

${settings.company_name}
${settings.company_address}
Tel: ${settings.company_phone}
Email: ${settings.company_email}`;
  };

  // Set defaults when dialog opens
  useState(() => {
    setSubject(getDefaultSubject());
    setMessage(getDefaultMessage());
  });

  const handleSendEmail = () => {
    // Create mailto link
    const mailtoSubject = encodeURIComponent(subject || getDefaultSubject());
    const mailtoBody = encodeURIComponent(message || getDefaultMessage());
    const mailtoLink = `mailto:${recipientEmail}${ccEmail ? `?cc=${ccEmail}` : '?'}${ccEmail ? '&' : ''}subject=${mailtoSubject}&body=${mailtoBody}`;

    // Open default email client
    window.open(mailtoLink, '_blank');

    setSent(true);
    setTimeout(() => {
      onClose();
      setSent(false);
    }, 2000);
  };

  const handleCopyEmail = async () => {
    const emailContent = `
${isNL ? 'Aan' : 'To'}: ${recipientEmail}
${isNL ? 'Onderwerp' : 'Subject'}: ${subject || getDefaultSubject()}

${message || getDefaultMessage()}
    `.trim();

    await navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            {isNL ? 'Offerte Versturen per E-mail' : 'Send Quotation by Email'}
          </DialogTitle>
          <DialogDescription>
            {isNL
              ? 'Stuur de offerte direct naar de klant via e-mail'
              : 'Send the quotation directly to the client via email'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{configuration.name}</div>
                  <div className="text-sm text-slate-500">
                    {configuration.boat_model} - {configuration.propulsion_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600">
                    {formatEuroCurrency(total)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isNL ? 'incl. BTW' : 'incl. VAT'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{isNL ? 'Ontvanger E-mail' : 'Recipient Email'} *</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="klant@example.nl"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label>{isNL ? 'CC (optioneel)' : 'CC (optional)'}</Label>
              <Input
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="collega@navisol.nl"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label>{isNL ? 'Onderwerp' : 'Subject'}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={getDefaultSubject()}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label>{isNL ? 'Bericht' : 'Message'}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getDefaultMessage()}
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Attachment Note */}
          <Alert>
            <Paperclip className="h-4 w-4" />
            <AlertDescription>
              {isNL
                ? 'Tip: Genereer eerst de PDF offerte en voeg deze als bijlage toe aan uw e-mail.'
                : 'Tip: Generate the PDF quotation first and attach it to your email.'}
            </AlertDescription>
          </Alert>

          {sent && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <Check className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700">
                {isNL
                  ? 'E-mail client geopend. Voeg de PDF bij en verstuur!'
                  : 'Email client opened. Attach the PDF and send!'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCopyEmail}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? (isNL ? 'Gekopieerd!' : 'Copied!') : (isNL ? 'Kopieer' : 'Copy')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {isNL ? 'Annuleren' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!recipientEmail}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {isNL ? 'Open E-mail Client' : 'Open Email Client'}
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Standalone email button component
interface EmailButtonProps {
  configuration: BoatConfiguration;
  client?: Client | null;
  quotationNumber?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function EmailQuotationButton({ configuration, client, quotationNumber, variant = 'outline', size = 'sm' }: EmailButtonProps) {
  const [open, setOpen] = useState(false);
  const { settings } = useNavisol();
  const isNL = settings.language === 'nl';

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4 mr-1" />
        {isNL ? 'E-mail' : 'Email'}
      </Button>
      <EmailQuotation
        open={open}
        onClose={() => setOpen(false)}
        configuration={configuration}
        client={client}
        quotationNumber={quotationNumber}
      />
    </>
  );
}
