
import { createContext, useContext, useState, useCallback, useRef } from "react";
import axiosApi from "../utils/api.js";
import { useNavigate } from "react-router-dom";

const SearchContext = createContext()


export function SearchProvider({ children }) {

    const abortControllerRef = useRef(null);

    //  for storing search result in the cache so when user comes back so no api will call here
    const searchCache = useRef({})

    const requestIdRef = useRef(0)

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
        dateTo: null,
        date: null
    })

    //  pagination state
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [loadingMore, setLoadingMore] = useState(false)

    const navigate = useNavigate();


    //  search api
    const searchApi = useCallback(async (filters, page = 1) => {

        const cacheKey = JSON.stringify({ filters, page })
        const thisRequestId = ++requestIdRef.current


        if (searchCache.current[cacheKey]) {
            const cachedData = searchCache.current[cacheKey]
            if (page === 1) setSearchResults(cachedData.results || [])
            else setSearchResults(prev => [...prev, ...(cachedData.results || [])]);
            setTotalCount(cachedData.totalCount);
            setCurrentPage(page);
            setIsSearchMode(true);
            setSearchFilters(filters);
            setSearchLoading(false);
            setLoadingMore(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            if (page === 1) setSearchLoading(true)
            else setLoadingMore(true)

            setSearchError(null)
            setIsSearchMode(true)
            setSearchFilters(filters)

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


            const { data } = await axiosApi.get("/search/filter", {
                params,
                signal: controller.signal
            })


            if (thisRequestId !== requestIdRef.current) {
                return
            }

            searchCache.current[cacheKey] = data;

            if (page === 1) setSearchResults(data.results || [])
            else setSearchResults(prev => [...prev, ...(data.results || [])])

            setTotalCount(data.totalCount)
            setCurrentPage(page)


        } catch (error) {
            if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
                return;
            }
            if (thisRequestId !== requestIdRef.current) {
                return
            }
            setSearchError(error.response?.data?.message || "Search failed")
            setSearchResults([])
        } finally {
            if (thisRequestId === requestIdRef.current) {
                setSearchLoading(false)
                setLoadingMore(false)
            } else {
                console.log(`[searchApi] FINALLY SKIPPED (stale) id=${thisRequestId}`)
            }
        }
    }, [])


    // load more pagination here
    const loadMore = useCallback(() => {
        if (searchLoading || loadingMore) return
        if (searchResults.length >= totalCount) return
        searchApi(searchFilters, currentPage + 1)
    }, [searchLoading, loadingMore, searchResults, totalCount, currentPage, searchFilters, searchApi])


    const purgeSearchCache = useCallback(() => {
        searchCache.current = {}
    }, [])

    // when search clear 
    const clearSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        requestIdRef.current++
        setIsSearchMode(false)
        setSearchResults([])
        setSearchError(null)
        setSearchLoading(false)
        setLoadingMore(false)
        setTotalCount(0)
        setCurrentPage(1)
        setSearchFilters({
            query: "", fileType: null, ownerFilter: null, location: null,
            folderId: null, personIds: null, personNames: null,
            dateFrom: null, dateTo: null, date: null
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
            purgeSearchCache,
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



