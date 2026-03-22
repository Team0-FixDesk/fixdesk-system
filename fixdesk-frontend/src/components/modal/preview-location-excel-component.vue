<script setup>
import { computed } from 'vue'

const props = defineProps({
  locations:Array
})

const emit = defineEmits(['back','close','refresh','success','error'])

const API_BASE = import.meta.env.VITE_API_BASE

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type':'application/json',
    Authorization:`Bearer ${token}`
  }
}

const selectedCount = computed(() =>
  props.locations.filter(l=>l.selected && l.isValid).length
)

const allSelected = computed({
  get(){
    const valid = props.locations.filter(l=>l.isValid)
    return valid.length && valid.every(l=>l.selected)
  },
  set(val){
    props.locations.forEach(l=>{
      if(l.isValid) l.selected = val
    })
  }
})

async function importSelected(){

  const selected = props.locations.filter(l=>l.selected && l.isValid)

  try{

    const res = await fetch(`${API_BASE}/locations/import`,{
      method:'POST',
      headers:getAuthHeaders(),
      body:JSON.stringify({locations:selected})
    })

    const result = await res.json()

    if(!res.ok){
      emit('error',result.message || 'Import ไม่สำเร็จ')
      return
    }

    emit('success',result)
    emit('refresh')
    emit('close')

  }catch{
    emit('error','เชื่อมต่อ backend ไม่ได้')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="allSelected" class="hidden peer"/>
        <div class="flex items-center justify-center w-4 h-4 border border-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600">
          <svg
            v-if="allSelected"
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span>เลือกทั้งหมด</span>
      </label>

      <span class="text-sm text-gray-500">
        {{ selectedCount }} รายการที่เลือก
      </span>
    </div>

    <div class="overflow-auto border rounded-lg max-h-96">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-100">
          <tr>
            <th class="p-2"></th>
            <th class="p-2 text-left">อาคาร</th>
            <th class="p-2 text-left">ชั้น</th>
            <th class="p-2 text-left">ห้อง</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="l in locations"
            :key="l.id"
            :class="!l.isValid ? 'bg-red-50' : 'hover:bg-gray-50'"
          >
            <td class="p-2">
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="l.selected" :disabled="!l.isValid" class="hidden peer"/>
                <div class="flex items-center justify-center w-4 h-4 border border-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:opacity-40">
                  <svg
                    v-if="l.selected"
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </label>
            </td>
            <td class="p-2">{{ l.building_name }}</td>
            <td class="p-2">{{ l.floor_name }}</td>
            <td class="p-2">{{ l.room_name }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <button
        class="px-4 py-2 border rounded-md"
        @click="$emit('back')"
      >
        ย้อนกลับ
      </button>

      <button
        class="px-4 py-2 text-white bg-green-500 rounded-md disabled:bg-gray-400"
        :disabled="selectedCount===0"
        @click="importSelected"
      >
        Import {{ selectedCount }}
      </button>
    </div>
  </div>
</template>
