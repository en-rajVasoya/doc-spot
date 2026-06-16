
import { createContext, useContext, useState, useCallback } from "react";
import axiosApi from "../utils/api.js";
import { useNavigate } from "react-router-dom";

const SearchContext = createContext()


export function SearchProvider({ children }) {

    const [isSearchMode, setIsSearchMode] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const [searchFilters, setSearchFilters] = useState({
        query: "",
        fileType: null,
        ownerFilter: null,
        location: null,
        folderId: null,
        personIds: null,
        personNames: null,
        dateFrom: null,
        dateTo: null
    })

    //  pagination state
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [loadingMore, setLoadingMore] = useState(false)

    const navigate = useNavigate();


    //  search api
    const searchApi = useCallback(async (filters, page = 1) => {
        try {
            if (page === 1) {
                setSearchLoading(true)
            } else {
                setLoadingMore(true)
            }
            setSearchError(null)
            setIsSearchMode(true)

            const params = {}
            if (filters.query) params.query = filters.query
            if (filters.fileType) params.fileType = filters.fileType
            if (filters.ownerFilter) params.ownerFilter = filters.ownerFilter
            if (filters.location) params.location = filters.location
            if (filters.folderId) params.folderId = filters.folderId
            if (filters.personIds) params.personIds = JSON.stringify(filters.personIds)
            if (filters.dateFrom) params.dateFrom = filters.dateFrom
            if (filters.dateTo) params.dateTo = filters.dateTo
            params.page = page

            const { data } = await axiosApi.get("/search/filter", { params })

            if (page === 1) {
                setSearchResults(data.results || [])
            } else {
                setSearchResults(prev => [...prev, ...(data.results || [])])
            }

            setTotalCount(data.totalCount)
            setCurrentPage(page)
            setSearchFilters(filters)

        } catch (error) {
            setSearchError(error.response?.data?.message || "Search failed")
            setSearchResults([])
        } finally {
            setSearchLoading(false)
            setLoadingMore(false)
        }
    }, [])


    // load more pagination here
    const loadMore = useCallback(() => {
        if (searchLoading) return
        if (searchResults.length >= totalCount) return
        searchApi(searchFilters, currentPage + 1)
    }, [searchLoading, searchResults, totalCount, currentPage, searchFilters, searchApi])


    // when search clear 
    const clearSearch = useCallback(() => {
        setIsSearchMode(false)
        setSearchResults([])
        setSearchError(null)
        setTotalCount(0)
        setCurrentPage(1)
        setSearchFilters({
            query: "",
            fileType: null,
            ownerFilter: null,
            location: null,
            folderId: null,
            personIds: null,
            personNames: null,
            dateFrom: null,
            dateTo: null
        })
    }, [])


    return (
        <SearchContext.Provider value={{
            isSearchMode,
            searchResults,
            searchLoading,
            searchError,
            searchFilters,
            searchApi,
            clearSearch,
            setSearchResults,
            loadMore,
            totalCount,
            currentPage,
            loadingMore
        }}>
            {children}
        </SearchContext.Provider>
    )

}


export function useSearch() {
    return useContext(SearchContext)
}



