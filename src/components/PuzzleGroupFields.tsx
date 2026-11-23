import type { CustomPuzzleDraft } from "../game/customPuzzle";
import { MAX_CATEGORY_LENGTH, MAX_WORD_LENGTH } from "../game/customPuzzle";
import { DIFFICULTY } from "../theme";

export function PuzzleGroupFields({
  groups,
  onCategory,
  onWord,
}: {
  groups: CustomPuzzleDraft["groups"];
  onCategory: (groupIndex: number, category: string) => void;
  onWord: (groupIndex: number, wordIndex: number, word: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, groupIndex) => {
        const tier = DIFFICULTY[(groupIndex + 1) as 1 | 2 | 3 | 4];
        return (
          <section
            key={tier.name}
            className="rounded-sm bg-comms-tile p-3"
            style={{ boxShadow: `inset 4px 0 0 ${tier.color}` }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-comms-muted">
                {tier.name}
              </p>
              <span
                className="h-2 w-8 rounded-sm"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
            </div>
            <input
              value={group.category}
              maxLength={MAX_CATEGORY_LENGTH}
              onChange={(e) => onCategory(groupIndex, e.target.value)}
              placeholder="Category"
              className="mb-2 w-full rounded-sm border border-comms-text/10 bg-comms-bg px-3 py-2 font-display text-sm uppercase tracking-wide text-comms-text outline-none placeholder:text-comms-muted/50 focus:border-comms-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              {group.words.map((word, wordIndex) => (
                <input
                  key={wordIndex}
                  value={word}
                  maxLength={MAX_WORD_LENGTH}
                  onChange={(e) =>
                    onWord(groupIndex, wordIndex, e.target.value)
                  }
                  placeholder={`Word ${wordIndex + 1}`}
                  className="rounded-sm border border-comms-text/10 bg-comms-bg px-2 py-2 text-center font-body text-xs font-semibold uppercase tracking-wide text-comms-text outline-none placeholder:text-comms-muted/50 focus:border-comms-accent"
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
