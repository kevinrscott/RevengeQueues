import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function containsObscenity(text?: string | null): boolean {
  if (!text) return false;
  return matcher.hasMatch(text);
}

export function assertCleanName(
  fieldName: string,
  value?: string | null,
  opts?: { min?: number; max?: number }
) {
  if (!value) return;

  const min = opts?.min ?? 3;
  const max = opts?.max ?? 20;

  const regex = new RegExp(
    `^[a-zA-Z0-9 _\\-]{${min},${max}}$`
  );

  if (!regex.test(value)) {
    throw new Error(
      `Field "${fieldName}" must be ${min}-${max} characters and use only letters, numbers, spaces, _ or -.`
    );
  }

  if (containsObscenity(value)) {
    throw new Error(`Field "${fieldName}" contains inappropriate language.`);
  }
}

export function assertCleanText(fieldName: string, value?: string | null) {
  if (!value) return;

  if (containsObscenity(value)) {
    throw new Error(`Field "${fieldName}" contains inappropriate language.`);
  }
}
