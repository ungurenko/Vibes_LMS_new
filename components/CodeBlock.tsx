import React, { useState, memo } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { useSound } from '../SoundContext';
import { copyToClipboard } from '../lib/clipboard';

const CodeBlock = memo(function CodeBlock({ code, language = 'text' }: { code: string; language?: string }) {
  const { playSound } = useSound();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    playSound('copy');
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg group font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-400 lowercase font-medium">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 rounded-md min-h-[44px]"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? <span className="text-emerald-500">Скопировано</span> : <span>Копировать</span>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <pre className="text-zinc-300 leading-relaxed whitespace-pre font-mono text-[13px]">
          {code}
        </pre>
      </div>
    </div>
  );
});

export default CodeBlock;
