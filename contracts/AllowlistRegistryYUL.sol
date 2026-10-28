// SPDX-License-Identifier: GPL-2.0-or-later
// TokenX Contracts v1.0.2 (extensions/AllowlistRegistry.sol)
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract module which provides a registry of allowlist accounts, where
 * there is an account that can be granted access to specific.
 *
 * Only the owner are allowed to manages the allowlist accounts.
 */
contract AllowlistRegistry is Ownable {
    mapping(address => bool) private _allowlist;

    /**
     * @dev Emitted when new account has added to allowlist.
     */
    // keccak256("AddedAllowlist(account)")
    bytes32 internal constant _ADDEDALLOWLIST_HASH = 0x1b7082a24617e15d2413cadac8e9d382a5475fbf157b3edae34c1982794591e8;

    /**
     * @dev Emitted when an account has removed from allowlist.
     */
    // keccak256("RemovedAllowlist(account)")
    bytes32 internal constant _REMOVEDALLOWLIST_HASH = 0x7cc249618d5d0c21a8f5b3118d3053d09ebe80a1d6225834207b63f1fc3ed652;

    /**
     * @dev Returns the allowlist status of an account.
     */
    function isAllowlist(address account) external view virtual returns (bool allowlist) {
        assembly {
            // _allowlist[account];
            mstore(0x00, account)
            mstore(0x20, 0x00)
            allowlist := sload(keccak256(0x00, 0x40))
        }
    }

    /**
     * @dev Add `account` to allowlist.
     *
     * Requirements:
     *
     * - the caller must be owner.
     */
    function addAllowlist(address account) external virtual onlyOwner {
        assembly {
            // _allowlist[account] = true;
            mstore(0x00, account)
            mstore(0x20, 0x00)
            sstore(keccak256(0x00, 0x40), true)

            // emit AddedAllowlist(account);
            mstore(0x00, account)
            log1(0x00, 0x20, _ADDEDALLOWLIST_HASH)
        }
    }

    /**
     * @dev Remove `account` to allowlist.
     *
     * Requirements:
     *
     * - the caller must be owner.
     */
    function removeAllowlist(address account) external virtual onlyOwner {
        assembly {
            // _allowlist[account] = false;
            mstore(0x00, account)
            mstore(0x20, 0x00)
            sstore(keccak256(0x00, 0x40), false)

            // emit AddedAllowlist(account);
            mstore(0x00, account)
            log1(0x00, 0x20, _REMOVEDALLOWLIST_HASH)
        }
    }
}