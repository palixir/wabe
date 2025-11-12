const irregularNoun = [
	{ singular: 'alumnus', plural: 'alumni' },
	{ singular: 'analysis', plural: 'analyses' },
	{ singular: 'appendix', plural: 'appendices' },
	{ singular: 'axis', plural: 'axes' },
	{ singular: 'bacillus', plural: 'bacilli' },
	{ singular: 'basis', plural: 'bases' },
	{ singular: 'beau', plural: 'beaux' },
	{ singular: 'bureau', plural: 'bureaux' },
	{ singular: 'cactus', plural: 'cacti' },
	{ singular: 'census', plural: 'censuses' },
	{ singular: 'child', plural: 'children' },
	{ singular: 'corpus', plural: 'corpora' },
	{ singular: 'criterion', plural: 'criteria' },
	{ singular: 'curriculum', plural: 'curricula' },
	{ singular: 'datum', plural: 'data' },
	{ singular: 'deer', plural: 'deer' },
	{ singular: 'diagnosis', plural: 'diagnoses' },
	{ singular: 'die', plural: 'dice' },
	{ singular: 'elf', plural: 'elves' },
	{ singular: 'ellipsis', plural: 'ellipses' },
	{ singular: 'fish', plural: 'fish' },
	{ singular: 'focus', plural: 'foci' },
	{ singular: 'foot', plural: 'feet' },
	{ singular: 'formula', plural: 'formulae' },
	{ singular: 'fungus', plural: 'fungi' },
	{ singular: 'genus', plural: 'genera' },
	{ singular: 'goose', plural: 'geese' },
	{ singular: 'half', plural: 'halves' },
	{ singular: 'hypothesis', plural: 'hypotheses' },
	{ singular: 'index', plural: 'indices' },
	{ singular: 'knife', plural: 'knives' },
	{ singular: 'life', plural: 'lives' },
	{ singular: 'loaf', plural: 'loaves' },
	{ singular: 'louse', plural: 'lice' },
	{ singular: 'man', plural: 'men' },
	{ singular: 'matrix', plural: 'matrices' },
	{ singular: 'medium', plural: 'media' },
	{ singular: 'memorandum', plural: 'memoranda' },
	{ singular: 'moose', plural: 'moose' },
	{ singular: 'mouse', plural: 'mice' },
	{ singular: 'nucleus', plural: 'nuclei' },
	{ singular: 'oasis', plural: 'oases' },
	{ singular: 'ox', plural: 'oxen' },
	{ singular: 'parenthesis', plural: 'parentheses' },
	{ singular: 'person', plural: 'people' },
	{ singular: 'phenomenon', plural: 'phenomena' },
	{ singular: 'phylum', plural: 'phyla' },
	{ singular: 'potato', plural: 'potatoes' },
	{ singular: 'radius', plural: 'radii' },
	{ singular: 'sheep', plural: 'sheep' },
	{ singular: 'species', plural: 'species' },
	{ singular: 'stimulus', plural: 'stimuli' },
	{ singular: 'stratum', plural: 'strata' },
	{ singular: 'syllabus', plural: 'syllabi' },
	{ singular: 'thesis', plural: 'theses' },
	{ singular: 'tomato', plural: 'tomatoes' },
	{ singular: 'tooth', plural: 'teeth' },
	{ singular: 'vertebra', plural: 'vertebrae' },
	{ singular: 'wife', plural: 'wives' },
	{ singular: 'woman', plural: 'women' },
]

export const pluralize = (noun: string): string => {
	const irregular = irregularNoun.find(
		(irregular) => irregular.singular === noun,
	)
	if (irregular) return irregular.plural

	if (
		noun.endsWith('s') ||
		noun.endsWith('x') ||
		noun.endsWith('z') ||
		noun.endsWith('ch') ||
		noun.endsWith('sh')
	)
		return `${noun}es`

	const element = noun[noun.length - 2]

	if (!element) return `${noun}s`

	if (noun.endsWith('y') && !'aeiou'.includes(element))
		return `${noun.slice(0, -1)}ies`

	return `${noun}s`
}
