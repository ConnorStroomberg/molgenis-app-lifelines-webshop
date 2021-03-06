import ApplicationState from '@/types/ApplicationState'
// @ts-ignore
import { transformToRSQL } from '@molgenis/rsql'
import Getters from '@/types/Getters'
import Variant from '@/types/Variant'
import { Variable, VariableWithVariants } from '@/types/Variable'
import { TreeParent } from '@/types/Tree'
import Assessment from '@/types/Assessment'
import { TreeNode } from '@/types/TreeNode'
import { Section } from '@/types/Section'

export default {
  isSignedIn: (state: ApplicationState): boolean => !!state.context && !!state.context.context && state.context.context.authenticated,
  variants: (state: ApplicationState): Variant[] =>
    state.gridVariables === null ? [] : state.gridVariables.reduce((result: Variant[], variable: VariableWithVariants): Variant[] =>
      variable.variants.reduce((accumulator: Variant[], variant: Variant) =>
        accumulator.some((candidate: Variant): boolean => candidate.id === variant.id)
          ? accumulator
          : [...accumulator, variant], result), []),
  variantIds: (state: ApplicationState, getters: Getters): number[] =>
    getters.variants.map(variant => variant.id),
  rsql: (state: ApplicationState) => {
    let operands: Object[] = []
    if (state.facetFilter.ageGroupAt1A.length > 0) {
      operands.push({
        operator: 'OR',
        operands: state.facetFilter.ageGroupAt1A.map((ageGroup) => ({
          selector: 'll_nr.age_group_at_1a',
          comparison: '==',
          arguments: ageGroup
        }))
      })
    }
    if (state.facetFilter.ageGroupAt2A.length > 0) {
      operands.push({
        operator: 'OR',
        operands: state.facetFilter.ageGroupAt2A.map((ageGroup) => ({
          selector: 'll_nr.age_group_at_2a',
          comparison: '==',
          arguments: ageGroup
        }))
      })
    }
    if (state.facetFilter.ageGroupAt3A.length > 0) {
      operands.push({
        operator: 'OR',
        operands: state.facetFilter.ageGroupAt3A.map((ageGroup) => ({
          selector: 'll_nr.age_group_at_3a',
          comparison: '==',
          arguments: ageGroup
        }))
      })
    }
    if (state.facetFilter.subcohort.length > 0) {
      operands = [
        ...operands,
        ...state.facetFilter.subcohort.map(subcohort => ({
          selector: `ll_nr.subcohort${subcohort}_group`,
          comparison: '==',
          arguments: true
        })
        )]
    }
    if (state.facetFilter.gender.length > 0) {
      operands.push({
        operands: state.facetFilter.gender.map(
          (gender) => ({
            selector: 'll_nr.gender_group',
            comparison: '==',
            arguments: gender
          })),
        operator: 'OR'
      })
    }
    if (state.facetFilter.yearOfBirthRange.length > 0) {
      operands.push({
        selector: 'll_nr.year_of_birth',
        comparison: '=ge=',
        arguments: state.facetFilter.yearOfBirthRange[0]
      })
    }
    if (state.facetFilter.yearOfBirthRange.length > 1) {
      operands.push({
        selector: 'll_nr.year_of_birth',
        comparison: '=le=',
        arguments: state.facetFilter.yearOfBirthRange[1]
      })
    }
    return transformToRSQL({
      operator: 'AND',
      operands
    })
  },
  gridAssessments: (state: ApplicationState, getters: Getters) => {
    const assessmentIds: number[] = getters.variants.reduce((acc: number[], variant: Variant) =>
      acc.includes(variant.assessmentId) ? acc : [...acc, variant.assessmentId], [])
    return Object.values(state.assessments).filter(assessment => assessmentIds.includes(assessment.id))
  },
  grid: (state: ApplicationState, getters: Getters): number[][] | null =>
    state.gridVariables === null ? null : state.gridVariables.map((variable: VariableWithVariants) =>
      getters.gridAssessments.map((assessment: Assessment) => {
        if (state.variantCounts === null) return NaN
        const variants: Variant[] = variable.variants.filter((variant: Variant) => variant.assessmentId === assessment.id)
        const count: number = variants.reduce((sum: number, variant: Variant) => {
          // @ts-ignore
          const variantCount = state.variantCounts.find((variantCount) => variant.id === variantCount.variantId)
          return sum + (variantCount ? variantCount.count : 0)
        }, 0)
        return count
      })
    ),
  gridSelections: (state: ApplicationState, getters: Getters): boolean[][] | null =>
    state.gridVariables === null ? null : state.gridVariables.map(variable => {
      const variableSelections = state.gridSelection[variable.id]
      return getters.gridAssessments.map(assessment =>
        !!variableSelections && variableSelections.includes(assessment.id)
      )
    }),
  numberOfSelectedItems: (state: ApplicationState, getters: Getters): Number =>
    getters.gridSelections.reduce((total: number, item: boolean[]) => {
      return total + item.filter(Boolean).length
    }, 0),
  treeStructure: (state: ApplicationState, getters: Getters) => {
    const loadedSection: boolean = Object.keys(state.sections).length > 0
    const loadedSubSection: boolean = state.subSectionList.length > 0
    const loadedTreeStructure: boolean = state.treeStructure.length > 0
    if (loadedSection && loadedSubSection && loadedTreeStructure) {
      // return full tree
      return state.treeStructure.map((item:TreeParent) => {
        return {
          ...state.sections[item.key],
          children: item.list.map((id:number) => {
            return {
              name: state.subSectionList[id],
              id
            }
          })
        }
      })
    } else if (loadedSection) {
      // return temporary partial tree
      return Object.values(state.sections)
    }
    return []
  },
  isFilterdSubsectionLoading: (state: ApplicationState): boolean => (state.searchTerm !== null && state.filteredSections === null),
  isGridLoading: (state: ApplicationState): boolean => (state.gridVariables === null || state.variantCounts === null) && state.treeSelected !== -1,
  filteredTreeStructure: ({ filteredSections, filteredSubsections }: ApplicationState, { treeStructure }: Getters) => {
    if (filteredSections === null || filteredSubsections === null) {
      return treeStructure
    }
    return treeStructure.reduce((result: TreeNode[], section: TreeNode) => {
      if (filteredSections.includes(section.id)) {
        result.push(section)
      } else {
        const filteredChildren = section.children.filter(({ id }) => filteredSubsections.includes(id))
        if (filteredChildren.length > 0) {
          result.push({ ...section, children: filteredChildren })
        }
      }
      return result
    }, [])
  },
  searchTermQuery: (state: ApplicationState) => state.searchTerm && transformToRSQL({ selector: '*', comparison: '=q=', arguments: state.searchTerm }),
  isSearchResultEmpty: (state: ApplicationState, { filteredTreeStructure }: Getters): boolean => {
    return !!(state.searchTerm && filteredTreeStructure.length === 0)
  }
}
