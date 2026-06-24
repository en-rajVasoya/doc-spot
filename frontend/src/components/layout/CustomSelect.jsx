import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { components } from 'react-select';
import InteractiveIcon from './InteractiveIcon';
import userProfile from "@images/svgs/user-profile.svg";
import closeIcon from "@images/icon/close-icon.svg";
import UserAvatar from './UserAvatar';

const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";


const CustomOption = (props) => {
  const { data, innerRef, innerProps, isSelected, isFocused, selectProps } = props;

  if (selectProps.isProfile) {
    return (
      <div className='customSelect2__option'>
        <div ref={innerRef} {...innerProps} className='multi-select-profile-single-box multi-select-profile-single-drop-box'>
          <div className='multi-select-profile-box'>
            <UserAvatar user={{
              _id: data.value,
              name: data.label,
              profilePic: data.profilePic,
              thumbnail_profile_pic: data.thumbnail_profile_pic,
              compressed_profile_pic: data.compressed_profile_pic
            }} />

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
            {/* {data.profilePic ? (
              <img
                src={`${BASE_URL}${data.profilePic}`}
                alt=""
                width={22}
                height={22}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <InteractiveIcon defaultIcon={userProfile} alt="" width={22} height={22} />
            )} */}
            <UserAvatar user={{
              _id: data.value,
              name: data.label,
              profilePic: data.profilePic,
              thumbnail_profile_pic: data.thumbnail_profile_pic,
              compressed_profile_pic: data.compressed_profile_pic
            }} />
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