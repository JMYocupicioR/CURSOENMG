import { parseAgreementBody } from '../../content/legal/agreementBody';

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export function AgreementMarkdown({ source }: { source: string }) {
  const blocks = parseAgreementBody(source);

  return (
    <div className="space-y-3 text-xs leading-relaxed text-slate-700 sm:text-sm dark:text-slate-300">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 4 ? 'h5' : 'h4';
          return (
            <Tag
              key={index}
              className={
                block.level === 4
                  ? 'pt-1 text-sm font-semibold text-slate-800 dark:text-slate-100'
                  : 'pt-2 text-sm font-bold text-slate-900 dark:text-white'
              }
            >
              {block.text}
            </Tag>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th
                        key={header}
                        className="border-b border-slate-200 px-2 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:text-white"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border-b border-slate-100 px-2 py-2 align-top dark:border-slate-800"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index}>
            <RichText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
