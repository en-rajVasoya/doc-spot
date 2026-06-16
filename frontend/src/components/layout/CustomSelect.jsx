// import { useState } from 'react';
// import CreatableSelect from 'react-select/creatable';
// import { components } from 'react-select';
// import InteractiveIcon from './InteractiveIcon';
// import userProfile from "@images/svgs/user-profile.svg";


// const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

// //  here drop down option with email
// const CustomOption = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data, innerRef, innerProps } = props;

//     return (
//       <div className='customSelect2__option'>
//         <div ref={innerRef} {...innerProps} className='multi-select-profile-single-box multi-select-profile-single-drop-box '>
//           <div className='multi-select-profile-box'>
//             {data.profilePic ? (
//               <img
//                 src={`${BASE_URL}${data.profilePic}`}
//                 alt=""
//                 width={32}
//                 height={32}
//                 style={{ borderRadius: "50%", objectFit: "cover" }}
//               />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" />
//             )}
//           </div>
//           {/*  here user profile here */}
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name'>{data.label}</span>
//             {/*  email show */}
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </div>
//     )
//   }
//   return <components.Option {...props} />;
// }




// //  here for multi selected tags 
// const CustomMultiValueLabel = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data } = props;
//     const firstLetter = data.label ? data.label.charAt(0).toUpperCase() : '?';

//     return (
//       <components.MultiValueLabel {...props}>
//         <div className='multi-select-profile-single-box add-tag-box '>
//           <div className='multi-select-profile-box user-add-icon'>
//             {data.profilePic ? (
//               <img
//                 src={`${BASE_URL}${data.profilePic}`}
//                 alt=""
//                 width={22}
//                 height={22}
//                 style={{ borderRadius: "50%", objectFit: "cover" }}
//               />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
//             )}
//           </div>
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name me-2'>{data.label}</span>
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </components.MultiValueLabel>
//     );
//   }
//   return <components.MultiValueLabel {...props} />;
// };






// const CustomSelect = ({
//   options = [],
//   value = null,
//   onChange,
//   placeholder = "Select...",
//   isMulti = false,
//   isClearable = true,
//   isSearchable = true,
//   isDisabled = false,
//   showDropdownIndicator = true,
//   showIndicatorSeparator = true,
//   onCreateOption,
//   isProfile = false,
//   styles = {},
//   onInputChange
// }) => {

//   const customComponents = {
//     Option: CustomOption,
//     MultiValueLabel: CustomMultiValueLabel,
//     DropdownIndicator: showDropdownIndicator ? components.DropdownIndicator : null,
//     IndicatorSeparator: showIndicatorSeparator ? components.IndicatorSeparator : null,
//   };

//   const handleCreate = (inputValue) => {
//     if (onCreateOption) {
//       onCreateOption(inputValue);
//     }
//   };

//   return (
//     <CreatableSelect
//       className={`custom-select2 ${isProfile ? 'multi-select2' : ''}`}
//       classNamePrefix="customSelect2"
//       options={options}
//       value={value}
//       onChange={onChange}
//       onCreateOption={onCreateOption}
//       placeholder={placeholder}
//       isMulti={isMulti}
//       isClearable={isClearable}
//       isSearchable={isSearchable}
//       isDisabled={isDisabled}
//       isProfile={isProfile}
//       components={customComponents}
//       menuPortalTarget={document.body}
//       onInputChange={onInputChange}
//       filterOption={isProfile ? () => true : undefined}
//       isValidNewOption={isProfile ? () => false : undefined}
//       styles={{
//         ...styles,
//         control: (provided) => ({
//           ...provided,
//           borderColor: '#ccc',
//           minHeight: '40px',
//           ...styles.control,
//         }),
//         menuPortal: (base) => ({ ...base, zIndex: 9999 }),
//       }}
//     />
//   );
// };



// export default CustomSelect






// import { useState } from 'react';
// import CreatableSelect from 'react-select/creatable';
// import { components } from 'react-select';
// import InteractiveIcon from './InteractiveIcon';
// import userProfile from "@images/svgs/user-profile.svg";


// const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

// //  here drop down option with email
// const CustomOption = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data, innerRef, innerProps } = props;

//     return (
//       <div className='customSelect2__option'>
//         <div ref={innerRef} {...innerProps} className='multi-select-profile-single-box multi-select-profile-single-drop-box '>
//           <div className='multi-select-profile-box'>
//             {data.profilePic ? (
//               <img
//                 src={`${BASE_URL}${data.profilePic}`}
//                 alt=""
//                 width={32}
//                 height={32}
//                 style={{ borderRadius: "50%", objectFit: "cover" }}
//               />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" />
//             )}
//           </div>
//           {/*  here user profile here */}
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name'>{data.label}</span>
//             {/*  email show */}
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   // icon support
//   if (props.data.icon) {
//     const { data, innerRef, innerProps, isSelected, isFocused } = props;
//     return (
//       <div
//         ref={innerRef}
//         {...innerProps}
//         className="customSelect2__option"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: "8px",
//           padding: "8px 12px",
//           cursor: "pointer",
//           backgroundColor: isSelected ? "var(--primary-light)" : isFocused ? "var(--hover)" : "transparent",
//         }}
//       >
//         <InteractiveIcon defaultIcon={data.icon} width={32} height={28} alt="" />
//         <span>{data.label}</span>
//       </div>
//     );
//   }

//   return <components.Option {...props} />;
// }


// // here for selected value with icon or profile
// const CustomSingleValue = (props) => {
//   // icon support
//   if (props.data.icon) {
//     return (
//       <components.SingleValue {...props}>
//         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//           <InteractiveIcon defaultIcon={props.data.icon} width={32} height={28} alt="" />
//           <span>{props.data.label}</span>
//         </div>
//       </components.SingleValue>
//     );
//   }

//   // profile support
//   if (props.selectProps.isProfile) {
//     const { data } = props;
//     return (
//       <components.SingleValue {...props}>
//         <div className='multi-select-profile-single-box add-tag-box'>
//           <div className='multi-select-profile-box user-add-icon'>
//             {data.profilePic ? (
//               <img
//                 src={`${BASE_URL}${data.profilePic}`}
//                 alt=""
//                 width={22}
//                 height={22}
//                 style={{ borderRadius: "50%", objectFit: "cover" }}
//               />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
//             )}
//           </div>
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name'>{data.label}</span>
//           </div>
//         </div>
//       </components.SingleValue>
//     );
//   }

//   return <components.SingleValue {...props} />;
// };


// //  here for multi selected tags
// const CustomMultiValueLabel = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data } = props;

//     return (
//       <components.MultiValueLabel {...props}>
//         <div className='multi-select-profile-single-box add-tag-box '>
//           <div className='multi-select-profile-box user-add-icon'>
//             {data.profilePic ? (
//               <img
//                 src={`${BASE_URL}${data.profilePic}`}
//                 alt=""
//                 width={22}
//                 height={22}
//                 style={{ borderRadius: "50%", objectFit: "cover" }}
//               />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
//             )}
//           </div>
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name me-2'>{data.label}</span>
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </components.MultiValueLabel>
//     );
//   }
//   return <components.MultiValueLabel {...props} />;
// };


// const CustomSelect = ({
//   options = [],
//   value = null,
//   onChange,
//   placeholder = "Select...",
//   isMulti = false,
//   isClearable = false,   
//   isSearchable = true,
//   isDisabled = false,
//   showDropdownIndicator = true,
//   showIndicatorSeparator = true,
//   onCreateOption,
//   isProfile = false,
//   styles = {},
//   onInputChange,
//   maxSelectLimit = null,
// }) => {

//   const customComponents = {
//     Option: CustomOption,
//     MultiValueLabel: CustomMultiValueLabel,
//     SingleValue: CustomSingleValue,
//     DropdownIndicator: showDropdownIndicator ? components.DropdownIndicator : null,
//     IndicatorSeparator: showIndicatorSeparator ? components.IndicatorSeparator : null,
//   };

//   const handleCreate = (inputValue) => {
//     if (onCreateOption) {
//       onCreateOption(inputValue);
//     }
//   };

//   const handleChange = (val) => {
//     if (maxSelectLimit && val && val.length > maxSelectLimit) return;
//     onChange(val);
//   };

//   return (
//     <CreatableSelect
//       className={`custom-select2 ${isProfile ? 'multi-select2' : ''}`}
//       classNamePrefix="customSelect2"
//       options={options}
//       value={value}
//       onChange={handleChange}
//       onCreateOption={onCreateOption}
//       placeholder={placeholder}
//       isMulti={isMulti}
//       isClearable={isClearable}
//       isSearchable={isSearchable}
//       isDisabled={isDisabled}
//       isProfile={isProfile}
//       components={customComponents}
//       menuPortalTarget={document.body}
//       onInputChange={onInputChange}
//       filterOption={isProfile ? () => true : undefined}
//       isValidNewOption={isProfile ? () => false : undefined}
//       styles={{
//         ...styles,
//         control: (provided) => ({
//           ...provided,
//           borderColor: '#ccc',
//           minHeight: '40px',
//           ...styles.control,
//         }),
//         menuPortal: (base) => ({ ...base, zIndex: 9999 }),
//       }}
//     />
//   );
// };


// export default CustomSelect



// import { useState } from 'react';
// import CreatableSelect from 'react-select/creatable';
// import { components } from 'react-select';
// import InteractiveIcon from './InteractiveIcon';
// import userProfile from "@images/svgs/user-profile.svg";
// import closeIcon from "@images/icon/close-icon.svg";


// const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

// const CustomOption = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data, innerRef, innerProps } = props;
//     return (
//       <div className='customSelect2__option'>
//         <div ref={innerRef} {...innerProps} className='multi-select-profile-single-box multi-select-profile-single-drop-box'>
//           <div className='multi-select-profile-box'>
//             {data.profilePic ? (
//               <img src={`${BASE_URL}${data.profilePic}`} alt="" />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" />
//             )}
//           </div>
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name'>{data.label}</span>
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   if (props.data.icon) {
//     const { data, innerRef, innerProps, isSelected, isFocused } = props;
//     return (
//       <div
//         ref={innerRef}
//         {...innerProps}
//         className="customSelect2__option"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: "8px",
//           padding: "8px 12px",
//           cursor: "pointer",
//           backgroundColor: isSelected ? "var(--primary-light)" : isFocused ? "var(--hover)" : "transparent",
//         }}
//       >
//         <InteractiveIcon defaultIcon={data.icon} width={20} height={24} alt="" />
//         <span>{data.label}</span>
//       </div>
//     );
//   }

//   return <components.Option {...props} />;
// }


// const CustomSingleValue = (props) => {
//   if (props.data.icon) {
//     return (
//       <components.SingleValue {...props}>
//         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//           <InteractiveIcon defaultIcon={props.data.icon} width={20} height={24} alt="" />
//           <span>{props.data.label}</span>
//         </div>
//       </components.SingleValue>
//     );
//   }

//   if (props.selectProps.isProfile) {
//     const { data } = props;
//     return (
//       <components.SingleValue {...props}>
//         <div className='multi-select-profile-single-box add-tag-box' >
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name'>{data.label}</span>
//             <span className='dot-divider'></span>
//             <span className='multi-select-profile-email text-muted '>{data.email}</span>
//           </div>
//           <span
//            className='btn-only-icon'
//             onMouseDown={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               props.selectProps.onChange(null, { action: "clear" });
//             }}

//           >
//            <InteractiveIcon defaultIcon={closeIcon} width={20} alt="" />
//           </span>
//         </div>
//       </components.SingleValue>
//     );
//   }

//   return <components.SingleValue {...props} />;
// };


// const CustomMultiValueLabel = (props) => {
//   if (props.selectProps.isProfile) {
//     const { data } = props;
//     return (
//       <components.MultiValueLabel {...props}>
//         <div className='multi-select-profile-single-box add-tag-box'>
//           <div className='multi-select-profile-box user-add-icon'>
//             {data.profilePic ? (
//               <img src={`${BASE_URL}${data.profilePic}`} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
//             ) : (
//               <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
//             )}
//           </div>
//           <div className='multi-select-profile-contact-box'>
//             <span className='multi-select-profile-user-name me-2'>{data.label}</span>
//             {data.email && (
//               <span className='multi-select-profile-email text-muted'>{data.email}</span>
//             )}
//           </div>
//         </div>
//       </components.MultiValueLabel>
//     );
//   }
//   return <components.MultiValueLabel {...props} />;
// };


// const CustomMultiValueRemove = (props) => {
//   return (
//     <components.MultiValueRemove {...props}>
//       <span style={{ fontSize: "14px", lineHeight: 1, padding: "0 4px", cursor: "pointer" }}>×</span>
//     </components.MultiValueRemove>
//   );
// };


// const CustomSelect = ({
//   options = [],
//   value = null,
//   onChange,
//   placeholder = "Select...",
//   isMulti = false,
//   isClearable = false,
//   isSearchable = true,
//   isDisabled = false,
//   showDropdownIndicator = true,
//   showIndicatorSeparator = true,
//   onCreateOption,
//   isProfile = false,
//   styles = {},
//   onInputChange,
//   maxSelectLimit = null,
// }) => {

//   const customComponents = {
//     Option: CustomOption,
//     MultiValueLabel: CustomMultiValueLabel,
//     MultiValueRemove: CustomMultiValueRemove,
//     SingleValue: CustomSingleValue,
//     DropdownIndicator: showDropdownIndicator ? components.DropdownIndicator : null,
//     IndicatorSeparator: showIndicatorSeparator ? components.IndicatorSeparator : null,
//   };

//   const handleChange = (val) => {
//     if (maxSelectLimit && val && val.length > maxSelectLimit) return;
//     onChange(val);
//   };

//   return (
//     <CreatableSelect
//       className={`custom-select2 ${isProfile ? 'multi-select2' : ''}`}
//       classNamePrefix="customSelect2"
//       options={options}
//       value={value}
//       onChange={handleChange}
//       onCreateOption={onCreateOption}
//       placeholder={placeholder}
//       isMulti={isMulti}
//       isClearable={isClearable}
//       isSearchable={isSearchable}
//       isDisabled={isDisabled}
//       isProfile={isProfile}
//       components={customComponents}
//       menuPortalTarget={document.body}
//       onInputChange={onInputChange}
//       filterOption={isProfile ? () => true : undefined}
//       isValidNewOption={isProfile ? () => false : undefined}
//       styles={{
//         ...styles,
//         control: (provided) => ({
//           ...provided,
//           borderColor: '#ccc',
//           minHeight: '40px',
//           ...styles.control,
//         }),
//         menuPortal: (base) => ({ ...base, zIndex: 9999 }),
//       }}
//     />
//   );
// };


// export default CustomSelect



import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { components } from 'react-select';
import InteractiveIcon from './InteractiveIcon';
import userProfile from "@images/svgs/user-profile.svg";
import closeIcon from "@images/icon/close-icon.svg";

const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";


const CustomOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused, selectProps } = props;

  if (selectProps.isProfile) {
    return (
      <div className='customSelect2__option'>
        <div ref={innerRef} {...innerProps} className='multi-select-profile-single-box multi-select-profile-single-drop-box'>
          <div className='multi-select-profile-box'>
            {data.profilePic ? (
              <img src={`${BASE_URL}${data.profilePic}`} alt="" />
            ) : (
              <InteractiveIcon defaultIcon={userProfile} alt="" />
            )}
          </div>
          <div className='multi-select-profile-contact-box'>
            <span className='multi-select-profile-user-name'>{data.label}</span>
            {data.email && (
              <span className='multi-select-profile-email text-muted'>{data.email}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (data.icon) {
    return (
      <div
        ref={innerRef}
        {...innerProps}
        className="customSelect2__option"
      >
       <div className='customSelect2__option-wrapper'>
         <div className='customSelect2__option-img'>
          <InteractiveIcon defaultIcon={data.icon} width={20} height={24} alt="" />
        </div>
        <span className='customSelect2__option-label'>{data.label}</span>
       </div>
      </div>
    );
  }

  return <components.Option {...props} />;
};


const CustomSingleValue = (props) => {
  const { data, selectProps } = props;

  if (data.icon) {
    return (
      <components.SingleValue {...props}>
       
        <div className='customSelect2__option-wrapper'>
         <div className='customSelect2__option-img'>
          <InteractiveIcon defaultIcon={data.icon} width={20} height={24} alt="" />
        </div>
        <span className='customSelect2__option-label'>{data.label}</span>
       </div>
      </components.SingleValue>
    );
  }

  if (selectProps.isProfile) {
    return (
      <components.SingleValue {...props}>
        <div className='multi-select-profile-single-box add-tag-box'>
          <div className='multi-select-profile-contact-box'>
            <span className='multi-select-profile-user-name'>{data.label}</span>
            <span className='dot-divider'></span>
            <span className='multi-select-profile-email text-muted'>{data.email}</span>
          </div>
          <span
            className='btn-only-icon'
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectProps.onChange(null, { action: "clear" });
            }}
          >
            <InteractiveIcon defaultIcon={closeIcon} width={20} alt="" />
          </span>
        </div>
      </components.SingleValue>
    );
  }

  return <components.SingleValue {...props} />;
};


const CustomMultiValueLabel = (props) => {
  const { data, selectProps } = props;

  if (selectProps.isProfile) {
    return (
      <components.MultiValueLabel {...props}>
        <div className='multi-select-profile-single-box add-tag-box'>
          <div className='multi-select-profile-box user-add-icon'>
            {data.profilePic ? (
              <img
                src={`${BASE_URL}${data.profilePic}`}
                alt=""
                width={22}
                height={22}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
            )}
          </div>
          <div className='multi-select-profile-contact-box'>
            <span className='multi-select-profile-user-name me-2'>{data.label}</span>
            {data.email && (
              <span className='multi-select-profile-email text-muted'>{data.email}</span>
            )}
          </div>
        </div>
      </components.MultiValueLabel>
    );
  }

  return <components.MultiValueLabel {...props} />;
};


const CustomMultiValueRemove = (props) => {
  return (
    <components.MultiValueRemove {...props}>
      <InteractiveIcon defaultIcon={closeIcon} width={16} height={16} alt="remove" />
    </components.MultiValueRemove>
  );
};


const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  isMulti = false,
  isClearable = false,
  isSearchable = true,
  isDisabled = false,
  showDropdownIndicator = true,
  showIndicatorSeparator = true,
  onCreateOption,
  isProfile = false,
  styles: externalStyles = {},
  onInputChange,
  maxSelectLimit = null,
}) => {

  // isProfile ko CreatableSelect pe directly pass nahi karte,
  // balki selectProps ke through components ko milta hai via classNamePrefix trick.
  // Isliye hum isko custom prop ki tarah pass karte hain aur warning avoid karne ke
  // liye niche wale workaround se handle karte hain.

  const customComponents = {
    Option: CustomOption,
    MultiValueLabel: CustomMultiValueLabel,
    MultiValueRemove: CustomMultiValueRemove,
    SingleValue: CustomSingleValue,
    DropdownIndicator: showDropdownIndicator ? components.DropdownIndicator : () => null,
    IndicatorSeparator: showIndicatorSeparator ? components.IndicatorSeparator : () => null,
  };

  const handleChange = (val, actionMeta) => {
    if (isMulti && maxSelectLimit && Array.isArray(val) && val.length > maxSelectLimit) return;
    onChange(val, actionMeta);
  };

  const mergedStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: '#ccc',
      minHeight: '40px',
      ...(externalStyles.control ? externalStyles.control(provided) : {}),
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
      ...(externalStyles.menuPortal ? externalStyles.menuPortal(base) : {}),
    }),
    ...Object.fromEntries(
      Object.entries(externalStyles).filter(([key]) => !['control', 'menuPortal'].includes(key))
    ),
  };

  // Default value: isMulti ho to [] nahi to null
  const defaultValue = value !== undefined ? value : isMulti ? [] : null;

  return (
    <CreatableSelect
      className={`custom-select2 ${isProfile ? 'multi-select2' : ''}`}
      classNamePrefix="customSelect2"
      options={options}
      value={defaultValue}
      onChange={handleChange}
      onCreateOption={onCreateOption}
      placeholder={placeholder}
      isMulti={isMulti}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isDisabled={isDisabled}
      components={customComponents}
      menuPortalTarget={document.body}
      onInputChange={onInputChange}
      filterOption={isProfile ? () => true : undefined}
      isValidNewOption={isProfile ? () => false : undefined}
      styles={mergedStyles}
      // isProfile ko selectProps me inject karne ke liye
      isProfile={isProfile}
    />
  );
};


export default CustomSelect;