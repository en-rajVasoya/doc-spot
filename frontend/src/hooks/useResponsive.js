// import { useState, useEffect } from 'react';

// const useResponsive = () => {
//     const [screenSize, setScreenSize] = useState({
//         isSmallMobile: window.innerWidth < 425,
//         isMobile: window.innerWidth < 768,
//         // isTablet: window.innerWidth >= 768 && window.innerWidth < 992,
//         isDesktop: window.innerWidth >= 992
//     });

//     useEffect(() => {
//         const handleResize = () => {
//             setScreenSize({
//                 isSmallMobile: window.innerWidth < 425,
//                 isMobile: window.innerWidth < 768,
//                 // isTablet: window.innerWidth >= 768 && window.innerWidth < 992,
//                 isDesktop: window.innerWidth >= 992
//             });
//         };

//         // Attach event listener
//         window.addEventListener('resize', handleResize);
        
//         // Clean up the event listener when component unmounts
//         return () => window.removeEventListener('resize', handleResize);
//     }, []);

//     return screenSize;
// };

// export default useResponsive;



import { useState, useEffect } from 'react';

const getSizes = () => ({
    isSmallMobile: window.innerWidth < 425,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 992,
    isDesktop: window.innerWidth >= 992
});

const useResponsive = () => {
    const [screenSize, setScreenSize] = useState(getSizes);

    useEffect(() => {
        const handleResize = () => {
            setScreenSize(getSizes());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return screenSize;
};

export default useResponsive;