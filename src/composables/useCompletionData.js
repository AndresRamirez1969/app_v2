import { ref } from 'vue';
import axiosInstance from '@/utils/axios';

export function useCompletionData() {
  const completion = ref({
    expected: 0,
    completed: 0,
    rate: 0,
    start_date: null,
    end_date: null
  });

  const scope = ref('');
  const isLoading = ref(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchCompletion = async (organizationId, dateRange, frequency = null) => {
    if (!organizationId) {
      completion.value = {
        expected: 0,
        completed: 0,
        rate: 0,
        start_date: null,
        end_date: null,
        avg_time: 0
      };
      scope.value = '';
      return;
    }

    isLoading.value = true;
    try {
      const startDate = dateRange?.start || getTodayDate();
      const endDate = dateRange?.end || getTodayDate();

      const params = {
        organization_id: organizationId,
        start_date: startDate,
        end_date: endDate
      };

      if (frequency) {
        params.frequency = frequency;
      }

      const { data } = await axiosInstance.get('/dashboard/completion', { params });

      console.log('📈 Completion data received:', {
        completed: data.completion?.completed,
        expected: data.completion?.expected,
        fullData: data
      });

      if (data.completion) {
        completion.value = {
          expected: data.completion.expected || 0,
          completed: data.completion.completed || 0,
          rate: data.completion.rate || 0,
          start_date: data.completion.start_date || null,
          end_date: data.completion.end_date || null,
          avg_time: data.completion.avg_time || 0
        };
      }

      if (data.scope) {
        scope.value = data.scope;
      }
    } catch (error) {
      console.error('Error fetching completion data:', error);
      completion.value = {
        expected: 0,
        completed: 0,
        rate: 0,
        start_date: null,
        end_date: null,
        avg_time: 0
      };
      scope.value = '';
    } finally {
      isLoading.value = false;
    }
  };

  return {
    completion,
    scope,
    isLoading,
    fetchCompletion
  };
}