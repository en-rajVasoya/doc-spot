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



import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { components } from 'react-select';
import InteractiveIcon from './InteractiveIcon';
import userProfile from "@images/svgs/user-profile.svg";
import closeIcon from "@images/icon/close-icon.svg";


const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

const CustomOption = (props) => {
  if (props.selectProps.isProfile) {
    const { data, innerRef, innerProps } = props;
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
    )
  }

  if (props.data.icon) {
    const { data, innerRef, innerProps, isSelected, isFocused } = props;
    return (
      <div
        ref={innerRef}
        {...innerProps}
        className="customSelect2__option"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          cursor: "pointer",
          backgroundColor: isSelected ? "var(--primary-light)" : isFocused ? "var(--hover)" : "transparent",
        }}
      >
        <InteractiveIcon defaultIcon={data.icon} width={32} height={28} alt="" />
        <span>{data.label}</span>
      </div>
    );
  }

  return <components.Option {...props} />;
}


const CustomSingleValue = (props) => {
  if (props.data.icon) {
    return (
      <components.SingleValue {...props}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <InteractiveIcon defaultIcon={props.data.icon} width={20} height={24} alt="" />
          <span>{props.data.label}</span>
        </div>
      </components.SingleValue>
    );
  }

  if (props.selectProps.isProfile) {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <div className='multi-select-profile-single-box add-tag-box' >
          <div className='multi-select-profile-contact-box'>
            <span className='multi-select-profile-user-name'>{data.label}</span>
            <span className='dot-divider'></span>
            <span className='multi-select-profile-email text-muted '>{data.email}</span>
          </div>
          <span
           className='btn-only-icon'
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.selectProps.onChange(null, { action: "clear" });
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
  if (props.selectProps.isProfile) {
    const { data } = props;
    return (
      <components.MultiValueLabel {...props}>
        <div className='multi-select-profile-single-box add-tag-box'>
          <div className='multi-select-profile-box user-add-icon'>
            {data.profilePic ? (
              <img src={`${BASE_URL}${data.profilePic}`} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
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
      <span style={{ fontSize: "14px", lineHeight: 1, padding: "0 4px", cursor: "pointer" }}>×</span>
    </components.MultiValueRemove>
  );
};


const CustomSelect = ({
  options = [],
  value = null,
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
  styles = {},
  onInputChange,
  maxSelectLimit = null,
}) => {

  const customComponents = {
    Option: CustomOption,
    MultiValueLabel: CustomMultiValueLabel,
    MultiValueRemove: CustomMultiValueRemove,
    SingleValue: CustomSingleValue,
    DropdownIndicator: showDropdownIndicator ? components.DropdownIndicator : null,
    IndicatorSeparator: showIndicatorSeparator ? components.IndicatorSeparator : null,
  };

  const handleChange = (val) => {
    if (maxSelectLimit && val && val.length > maxSelectLimit) return;
    onChange(val);
  };

  return (
    <CreatableSelect
      className={`custom-select2 ${isProfile ? 'multi-select2' : ''}`}
      classNamePrefix="customSelect2"
      options={options}
      value={value}
      onChange={handleChange}
      onCreateOption={onCreateOption}
      placeholder={placeholder}
      isMulti={isMulti}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isDisabled={isDisabled}
      isProfile={isProfile}
      components={customComponents}
      menuPortalTarget={document.body}
     
      onInputChange={onInputChange}
      filterOption={isProfile ? () => true : undefined}
      isValidNewOption={isProfile ? () => false : undefined}
      styles={{
        ...styles,
        control: (provided) => ({
          ...provided,
          borderColor: '#ccc',
          minHeight: '40px',
          ...styles.control,
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
};


export default CustomSelect