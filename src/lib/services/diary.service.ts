import { supabase } from '$lib/utils/supabase.js'
import type { DiaryEntry, DiaryEntryInsert } from '$lib/types/database.js'

export interface ExtendedDiaryEntryInsert extends DiaryEntryInsert {
	content_html?: string
	content_json?: any
	content_text?: string
	template_type?: string
	calculation_data?: any
	revision_number?: number
	is_draft?: boolean
}

export interface DiaryEntryWithDetails extends DiaryEntry {
	calculationCount?: number
	photoCount?: number
	planReferences?: Array<{
		id: string
		referenceNumber: string
		title: string
		pageNumber?: number
	}>
	mapReferences?: Array<{
		id: string
		lat: number
		lng: number
		description: string
	}>
}

export interface DiaryTemplate {
	id: string
	name: string
	description: string
	category: string
	icon: string
	content: string
	is_system: boolean
	is_favorite?: boolean
	usage_count?: number
	created_by?: string
	created_at: string
}

export interface DiaryCalculation {
	id: string
	diary_entry_id: string
	calculation_type: 'bearing' | 'distance' | 'area' | 'traverse'
	input_data: Record<string, any>
	result_data: Record<string, any>
	formula_used?: string
	created_at: string
}

export interface DiaryStats {
	totalEntries: number
	totalCalculations: number
	totalPhotos: number
	daysActive: number
	recentActivity: Array<{
		date: string
		entryCount: number
		calculationCount: number
		photoCount: number
	}>
}

class DiaryService {
	/**
	 * Get all diary entries for a project
	 */
	async getProjectEntries(projectId: string): Promise<DiaryEntryWithDetails[]> {
		try {
			const { data, error } = await supabase
				.from('diary_entries')
				.select(`
					*,
					photos:photos(count),
					calculations:diary_calculations(count),
					plan_references:diary_plan_references(
						id,
						reference_text,
						search_documents(title)
					),
					map_references:diary_map_references(
						id,
						location_lat,
						location_lng,
						description
					)
				`)
				.eq('project_id', projectId)
				.order('entry_date', { ascending: false })

			if (error) throw error

			// Transform the data to include counts
			return data.map(entry => ({
				...entry,
				calculationCount: entry.calculations?.[0]?.count || 0,
				photoCount: entry.photos?.[0]?.count || 0,
				planReferences: entry.plan_references?.map((ref: any) => ({
					id: ref.id,
					referenceNumber: ref.reference_text,
					title: ref.search_documents?.title || 'Unknown Document',
					pageNumber: ref.page_number
				})) || [],
				mapReferences: entry.map_references?.map((ref: any) => ({
					id: ref.id,
					lat: ref.location_lat,
					lng: ref.location_lng,
					description: ref.description
				})) || []
			}))
		} catch (error) {
			throw error
		}
	}

	/**
	 * Get a single diary entry with full details
	 */
	async getEntry(entryId: string): Promise<DiaryEntryWithDetails | null> {
		try {
			const { data, error } = await supabase
				.from('diary_entries')
				.select(`
					*,
					photos:photos(*),
					calculations:diary_calculations(*),
					plan_references:diary_plan_references(
						*,
						search_documents(title, file_path)
					),
					map_references:diary_map_references(*),
					revisions:diary_revisions(*)
				`)
				.eq('id', entryId)
				.single()

			if (error) throw error
			if (!data) return null

			return {
				...data,
				calculationCount: data.calculations?.length || 0,
				photoCount: data.photos?.length || 0,
				planReferences: data.plan_references?.map((ref: any) => ({
					id: ref.id,
					referenceNumber: ref.reference_text,
					title: ref.search_documents?.title || 'Unknown Document',
					pageNumber: ref.page_number
				})) || [],
				mapReferences: data.map_references?.map((ref: any) => ({
					id: ref.id,
					lat: ref.location_lat,
					lng: ref.location_lng,
					description: ref.description
				})) || []
			}
		} catch (error) {
			throw error
		}
	}

	/**
	 * Create a new diary entry
	 */
	async createEntry(entry: ExtendedDiaryEntryInsert): Promise<DiaryEntry> {
		try {
			const { data, error } = await supabase
				.from('diary_entries')
				.insert({
					...entry,
					content_text: this.stripHtml(entry.content_html || ''),
					revision_number: 1,
					is_draft: false
				})
				.select()
				.single()

			if (error) throw error
			return data
		} catch (error) {
			throw error
		}
	}

	/**
	 * Update an existing diary entry
	 */
	async updateEntry(entryId: string, updates: Partial<ExtendedDiaryEntryInsert>): Promise<DiaryEntry> {
		try {
			// Create revision if content has changed
			if (updates.content_html) {
				await this.createRevision(entryId, updates.content_html)
			}

			const { data, error } = await supabase
				.from('diary_entries')
				.update({
					...updates,
					content_text: updates.content_html ? this.stripHtml(updates.content_html) : undefined,
					updated_at: new Date().toISOString()
				})
				.eq('id', entryId)
				.select()
				.single()

			if (error) throw error
			return data
		} catch (error) {
			throw error
		}
	}

	/**
	 * Delete a diary entry
	 */
	async deleteEntry(entryId: string): Promise<void> {
		try {
			const { error } = await supabase
				.from('diary_entries')
				.delete()
				.eq('id', entryId)

			if (error) throw error
		} catch (error) {
			throw error
		}
	}

	/**
	 * Create a revision of an entry
	 */
	private async createRevision(entryId: string, contentHtml: string): Promise<void> {
		try {
			// Get current entry to create revision
			const { data: currentEntry } = await supabase
				.from('diary_entries')
				.select('revision_number, content_html')
				.eq('id', entryId)
				.single()

			if (currentEntry) {
				await supabase
					.from('diary_revisions')
					.insert({
						diary_entry_id: entryId,
						revision_number: currentEntry.revision_number,
						content_html: currentEntry.content_html,
						content_json: null, // Would parse from HTML in real implementation
						changed_by: (await supabase.auth.getUser()).data.user?.id,
						change_summary: 'Content updated'
					})

				// Increment revision number
				await supabase
					.from('diary_entries')
					.update({ revision_number: currentEntry.revision_number + 1 })
					.eq('id', entryId)
			}
		} catch (error) {
			// Don't throw - revisions are nice to have but not critical
		}
	}

	/**
	 * Search diary entries
	 */
	async searchEntries(
		projectId: string, 
		query: string, 
		filters?: {
			dateFrom?: string
			dateTo?: string
			hasCalculations?: boolean
			hasPhotos?: boolean
			weather?: string
		}
	): Promise<DiaryEntryWithDetails[]> {
		try {
			let queryBuilder = supabase
				.from('diary_entries')
				.select(`
					*,
					photos:photos(count),
					calculations:diary_calculations(count)
				`)
				.eq('project_id', projectId)

			// Text search
			if (query) {
				queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content_text.ilike.%${query}%`)
			}

			// Date filters
			if (filters?.dateFrom) {
				queryBuilder = queryBuilder.gte('entry_date', filters.dateFrom)
			}
			if (filters?.dateTo) {
				queryBuilder = queryBuilder.lte('entry_date', filters.dateTo)
			}

			// Weather filter
			if (filters?.weather) {
				queryBuilder = queryBuilder.ilike('weather', `%${filters.weather}%`)
			}

			const { data, error } = await queryBuilder
				.order('entry_date', { ascending: false })

			if (error) throw error

			let results = data.map(entry => ({
				...entry,
				calculationCount: entry.calculations?.[0]?.count || 0,
				photoCount: entry.photos?.[0]?.count || 0
			}))

			// Filter by attachments
			if (filters?.hasCalculations) {
				results = results.filter(entry => entry.calculationCount > 0)
			}
			if (filters?.hasPhotos) {
				results = results.filter(entry => entry.photoCount > 0)
			}

			return results
		} catch (error) {
			throw error
		}
	}

	/**
	 * Get diary statistics for a project
	 */
	async getProjectStats(projectId: string): Promise<DiaryStats> {
		try {
			// Get basic counts
			const { data: entries } = await supabase
				.from('diary_entries')
				.select('entry_date')
				.eq('project_id', projectId)

			// Get calculations count (simplified query)
			const { count: calculationsCount } = await supabase
				.from('diary_calculations')
				.select('*', { count: 'exact', head: true })
				.in('diary_entry_id', entries?.map((e: any) => e.id) || [])

			const { data: photos } = await supabase
				.from('photos')
				.select('id')
				.eq('project_id', projectId)

			const totalEntries = entries?.length || 0
			const totalCalculations = calculationsCount || 0
			const totalPhotos = photos?.length || 0
			const daysActive = new Set(entries?.map(e => e.entry_date)).size

			// Get recent activity (last 30 days)
			const thirtyDaysAgo = new Date()
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

			const { data: recentEntries } = await supabase
				.from('diary_entries')
				.select(`
					entry_date,
					calculations:diary_calculations(count),
					photos:photos(count)
				`)
				.eq('project_id', projectId)
				.gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])

			const recentActivity = this.groupActivityByDate(recentEntries || [])

			return {
				totalEntries,
				totalCalculations,
				totalPhotos,
				daysActive,
				recentActivity
			}
		} catch (error) {
			throw error
		}
	}

	/**
	 * Add a calculation to a diary entry
	 */
	async addCalculation(calculation: Omit<DiaryCalculation, 'id' | 'created_at'>): Promise<DiaryCalculation> {
		try {
			const { data, error } = await supabase
				.from('diary_calculations')
				.insert(calculation)
				.select()
				.single()

			if (error) throw error
			return data
		} catch (error) {
			throw error
		}
	}

	/**
	 * Link a plan reference to a diary entry
	 */
	async addPlanReference(
		entryId: string, 
		documentId: string, 
		referenceText: string,
		pageNumber?: number
	): Promise<void> {
		try {
			const { error } = await supabase
				.from('diary_plan_references')
				.insert({
					diary_entry_id: entryId,
					search_document_id: documentId,
					reference_text: referenceText,
					page_number: pageNumber
				})

			if (error) throw error
		} catch (error) {
			throw error
		}
	}

	/**
	 * Link a map location to a diary entry
	 */
	async addMapReference(
		entryId: string,
		lat: number,
		lng: number,
		description: string,
		annotationId?: string
	): Promise<void> {
		try {
			const { error } = await supabase
				.from('diary_map_references')
				.insert({
					diary_entry_id: entryId,
					map_annotation_id: annotationId,
					location_lat: lat,
					location_lng: lng,
					description,
					reference_text: description
				})

			if (error) throw error
		} catch (error) {
			throw error
		}
	}

	/**
	 * Get system and user templates
	 */
	async getTemplates(userId?: string): Promise<DiaryTemplate[]> {
		try {
			let queryBuilder = supabase
				.from('diary_templates')
				.select('*')
				.order('is_system', { ascending: false })
				.order('usage_count', { ascending: false })

			if (userId) {
				queryBuilder = queryBuilder.or(`is_system.eq.true,created_by.eq.${userId}`)
			} else {
				queryBuilder = queryBuilder.eq('is_system', true)
			}

			const { data, error } = await queryBuilder

			if (error) throw error
			return data || []
		} catch (error) {
			return [] // Return empty array on error
		}
	}

	/**
	 * Create a custom template
	 */
	async createTemplate(template: Omit<DiaryTemplate, 'id' | 'created_at'>): Promise<DiaryTemplate> {
		try {
			const { data, error } = await supabase
				.from('diary_templates')
				.insert(template)
				.select()
				.single()

			if (error) throw error
			return data
		} catch (error) {
			throw error
		}
	}

	/**
	 * Update template usage count
	 */
	async incrementTemplateUsage(templateId: string): Promise<void> {
		try {
			const { error } = await supabase
				.rpc('increment_template_usage', { template_id: templateId })

			if (error) throw error
		} catch (error) {
			// Don't throw - this is just for stats
		}
	}

	/**
	 * Strip HTML tags for text search
	 */
	private stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
	}

	/**
	 * Group activity data by date
	 */
	private groupActivityByDate(entries: any[]): DiaryStats['recentActivity'] {
		const grouped = entries.reduce((acc, entry) => {
			const date = entry.entry_date
			if (!acc[date]) {
				acc[date] = {
					date,
					entryCount: 0,
					calculationCount: 0,
					photoCount: 0
				}
			}
			acc[date].entryCount++
			acc[date].calculationCount += entry.calculations?.[0]?.count || 0
			acc[date].photoCount += entry.photos?.[0]?.count || 0
			return acc
		}, {})

		return Object.values(grouped).sort((a: any, b: any) => 
			new Date(b.date).getTime() - new Date(a.date).getTime()
		) as DiaryStats['recentActivity']
	}
}

export const diaryService = new DiaryService()