<template>
  <div id="grid-view">
    <div class="col pt-5 mt-5" v-if="isEmptySearchResult">
      <h5 class="pt-2">No items were found matching the search term.</h5>
    </div>
    <div v-else>
      <grid-component
      v-if="treeSelected != -1"
      :grid="grid"
      :gridAssessments="gridAssessments"
      :gridVariables="gridVariables"
      :gridSelections="gridSelections"
      :isLoading="isGridLoading"
      :isSignedIn="isSignedIn"
      @gridRowToggle="handleGridRowToggle"
      @gridColumnToggle="handleGridColumnToggle"
      @gridCellToggle="handleGridCellToggle"
      @gridAllToggle="handleGridAllToggle"
      />
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import GridComponent from '../components/grid/GridComponent.vue'
import { mapActions, mapState, mapGetters, mapMutations } from 'vuex'

export default Vue.extend({
  name: 'GridView',
  components: { GridComponent },
  computed: {
    ...mapState(['treeSelected', 'gridVariables']),
    ...mapGetters(['rsql', 'gridAssessments', 'grid', 'gridSelections', 'numberOfSelectedItems', 'isSignedIn', 'isGridLoading']),
    isEmptySearchResult () {
      return this.$store.getters.isSearchResultEmpty
    }
  },
  methods: {
    ...mapMutations(['toggleGridSelection', 'toggleGridRow', 'toggleGridColumn', 'toggleAll']),
    ...mapActions(['loadGridVariables', 'loadGridData', 'loadAssessments']),
    handleGridRowToggle (variableId) {
      this.toggleGridRow({
        variableId,
        gridAssessments: this.gridAssessments
      })
    },
    handleGridColumnToggle (assessmentId) {
      this.toggleGridColumn({ assessmentId })
    },
    handleGridCellToggle (rowIndex, colIndex) {
      this.toggleGridSelection({
        variableId: this.gridVariables[rowIndex].id,
        assessmentId: this.gridAssessments[colIndex].id
      })
    },
    handleGridAllToggle () {
      this.toggleAll({ gridAssessments: this.gridAssessments })
    }
  },
  watch: {
    treeSelected: function () {
      this.loadGridVariables()
    },
    rsql: function () {
      this.loadGridData()
    }
  },
  created: function () {
    this.loadGridData()
  }
})
</script>
