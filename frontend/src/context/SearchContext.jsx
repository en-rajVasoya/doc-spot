
import { createContext, useContext, useState, useCallback, useRef } from "react";
import axiosApi from "../utils/api.js";
import { useNavigate } from "react-router-dom";

const SearchContext = createContext()


export function SearchProvider({ children }) {

    const abortControllerRef = useRef(null);

    //  for storing search result in the cache so when user comes back so no api will call here
    const searchCache = useRef({})

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

        //  create cache key  for sving search result here
        const cacheKey = JSON.stringify({ filters, page })

        //  cehck cache if we have search recently so no new search happens
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
            return; // We stop here! No API call is made.
        }

        // clear the previous request if still running here
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        //  create new controller for new request (must be outside the if block!)
        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            if (page === 1) {
                setSearchLoading(true)
            } else {
                setLoadingMore(true)
            }
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

            // 3. SAVE TO CACHE: Save the backend response into our memory dictionary for next time!
            searchCache.current[cacheKey] = data;

            if (page === 1) {
                setSearchResults(data.results || [])
            } else {
                setSearchResults(prev => [...prev, ...(data.results || [])])
            }

            setTotalCount(data.totalCount)
            setCurrentPage(page)


        } catch (error) {
            // Silently ignore if the error was just us cancelling the request
            if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
                return;
            }
            setSearchError(error.response?.data?.message || "Search failed")
            setSearchResults([])
        } finally {
            // Only stop the loading spinner if this specific request wasn't cancelled
            if (!controller.signal.aborted) {
                setSearchLoading(false)
                setLoadingMore(false)
            }
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

        // force stop the pending search api request instatly
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        setIsSearchMode(false)
        setSearchResults([])
        setSearchError(null)
        setSearchLoading(false)
        setLoadingMore(false)
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
            dateTo: null,
            date: null
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



