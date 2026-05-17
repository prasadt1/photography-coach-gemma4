/**
 * Maps L.E.N.S. coaching output to an Etsy-style listing draft (judge-facing commercial story).
 */

import React from 'react';
import {
  Camera, Tag, FileText, Layers, DollarSign, ExternalLink, Volume2, Copy, CheckCircle2,
} from 'lucide-react';
import { speak, stopSpeaking } from '../services/voiceCoach';

export interface MarketplaceListingDraft {
  title: string;
  description: string;
  altText: string;
  tags: string[];
  photoNote: string;
  categoryHint: string;
}

interface MarketplaceListingPreviewProps {
  draft: MarketplaceListingDraft;
  voiceEnabled?: boolean;
}

const ETSY_SELLER_HANDBOOK = 'https://www.etsy.com/seller-handbook/article/shop-listings/22465537963';

const MarketplaceListingPreview: React.FC<MarketplaceListingPreviewProps> = ({
  draft,
  voiceEnabled = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const fullPasteText = [
    `Title: ${draft.title}`,
    '',
    draft.description,
    '',
    `Tags: ${draft.tags.join(', ')}`,
    '',
    `Alt text (photo 1): ${draft.altText}`,
  ].join('\n');

  const handleCopyAll = () => {
    navigator.clipboard.writeText(fullPasteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHearListing = () => {
    stopSpeaking();
    const tagsLine = draft.tags.length ? `Tags: ${draft.tags.join(', ')}.` : '';
    speak(
      `Your Etsy listing draft. Title: ${draft.title}. Description: ${draft.description}. ${tagsLine} Alt text for your photo: ${draft.altText}. Copy these into Etsy when you create your listing.`,
    );
  };

  const rows: { icon: React.ReactNode; label: string; value: string; hint?: string }[] = [
    {
      icon: <Camera className="w-4 h-4" />,
      label: 'Photos & video',
      value: draft.photoNote,
      hint: 'Etsy allows up to 10 photos — your coached shot is photo one.',
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'Title',
      value: draft.title,
      hint: 'Up to 140 characters — specific, searchable words.',
    },
    {
      icon: <Layers className="w-4 h-4" />,
      label: 'Description',
      value: draft.description,
    },
    {
      icon: <Tag className="w-4 h-4" />,
      label: 'Tags',
      value: draft.tags.length ? draft.tags.join(' · ') : 'Add 13 phrase-tags in Etsy',
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Category',
      value: draft.categoryHint,
    },
  ];

  return (
    <section
      className="rounded-2xl border-2 border-[#C06B45] bg-gradient-to-br from-[#FFF8F0] to-[#F4ECDC] p-6 shadow-md"
      aria-labelledby="etsy-listing-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#C06B45] mb-1">Marketplace ready</p>
          <h3 id="etsy-listing-heading" className="text-lg font-bold font-serif text-[#241F18]">
            Etsy listing draft
          </h3>
          <p className="text-sm text-[#524A3D] mt-1 max-w-xl">
            L.E.N.S. turns a coached photo into copy you can paste into{' '}
            <a
              href="https://www.etsy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C06B45] font-semibold underline"
            >
              Etsy
            </a>
            {' '}or Shopify — so makers can sell, not just take better pictures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {voiceEnabled && (
            <button
              type="button"
              onClick={handleHearListing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2F4858] text-white text-sm font-semibold"
            >
              <Volume2 className="w-4 h-4" />
              Hear listing draft
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#C06B45] text-[#C06B45] text-sm font-semibold bg-white"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy all'}
          </button>
        </div>
      </div>

      <ul className="space-y-4 mb-5">
        {rows.map((row) => (
          <li key={row.label} className="rounded-xl bg-white/70 border border-[#D8CDB8] p-4">
            <div className="flex items-center gap-2 text-[#2F4858] mb-1">
              {row.icon}
              <span className="text-xs font-bold uppercase tracking-wider">{row.label}</span>
            </div>
            <p className="text-[#241F18] text-sm leading-relaxed">{row.value}</p>
            {row.hint && <p className="text-xs text-[#524A3D] mt-1">{row.hint}</p>}
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-[#2F4858]/10 border border-[#2F4858]/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-[#241F18]">
          <strong className="text-[#2F4858]">Roadmap:</strong> direct publish to Etsy & Shopify — not in this demo.
        </p>
        <a
          href={ETSY_SELLER_HANDBOOK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C06B45] underline"
        >
          Etsy listing guide
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  );
};

/** Build Etsy-oriented draft from SellMode / v3 analysis fields */
export function buildMarketplaceListingDraft(input: {
  subject: string;
  listingCopy: string;
  altText: string;
  tags?: string[];
  readyToList: boolean;
  primaryFix?: string;
}): MarketplaceListingDraft {
  const desc = input.listingCopy.trim();
  const titleSource = desc.split(/[.!?]/)[0]?.trim() || input.subject;
  const title =
    titleSource.length > 140 ? `${titleSource.slice(0, 137)}…` : titleSource;

  const tags =
    input.tags && input.tags.length > 0
      ? input.tags.slice(0, 13)
      : ['handmade', 'artisan', 'craft', 'unique gift', 'small business'].slice(0, 5);

  const photoNote = input.readyToList
    ? 'Your coached product photo is ready as the main listing image.'
    : `Use your current photo after one more fix: ${input.primaryFix || 'see coaching above'}.`;

  return {
    title,
    description: desc || input.subject,
    altText: input.altText || input.subject.slice(0, 120),
    tags,
    photoNote,
    categoryHint: 'Handmade · Home & Living or Craft Supplies — pick the closest match in Etsy',
  };
}

export default MarketplaceListingPreview;
